import { db, type Memory } from "./db";
import { cosineSimilarity, embed } from "./embeddings";

/** Cap on stored memories; the oldest is dropped when a new one would exceed it. */
export const MAX_MEMORIES = 100;
/** A new memory this close to an existing one is treated as a duplicate and skipped. */
const DEDUP_THRESHOLD = 0.9;
/** Memories below this similarity to the query are not recalled. Matches the
 *  proven notes threshold in retrieval.ts so recall behaves the same as notes. */
const RETRIEVAL_THRESHOLD = 0.3;
const MEMORY_SETTING_KEY = "navo-memory";
const USER_NAME_KEY = "navo-user-name";
/** Matches the exact wording the "my name is"/"call me" patterns below produce,
 *  so a name learned from chat can be recalled without an embedding lookup. */
const NAME_MEMORY_RE = /^The user(?:'s name is|goes by)\s+(.+?)\.$/;

/** Sentences that mention these are too fleeting to store as durable facts. */
const TRANSIENT_RE =
  /\b(today|tonight|right now|currently|at the moment|this (morning|afternoon|evening|week|weekend)|for (the|my|this) (exam|test|quiz|assignment|homework)|for now|just now)\b/i;
/** A sentence with a negation is skipped so "I'm not studying biology" isn't stored as a fact. */
const NEGATION_RE = /\b(not|never|no longer|isn't|aren't|wasn't|weren't|don't|doesn't|didn't|won't)\b|n't\b/i;

interface Pattern {
  re: RegExp;
  format: (match: RegExpMatchArray) => string;
}

/** Conservative patterns over the user's own words. Low recall on purpose: every
 *  captured memory should be a durable, user-stated fact, not a guess. */
const PATTERNS: Pattern[] = [
  { re: /\bmy name is\s+([\p{L}][\p{L}'-]{1,30})\b/iu, format: (m) => `The user's name is ${clean(m[1])}.` },
  { re: /\bcall me\s+([\p{L}][\p{L}'-]{1,30})\b/iu, format: (m) => `The user goes by ${clean(m[1])}.` },
  { re: /\bi(?:'m| am)\s+studying\s+([^.,!?\n]{2,40})/i, format: (m) => `The user is studying ${clean(m[1])}.` },
  { re: /\bi(?:'m| am)\s+learning\s+([^.,!?\n]{2,40})/i, format: (m) => `The user is learning ${clean(m[1])}.` },
  { re: /\bi\s+work\s+(?:as|at|in)\s+([^.,!?\n]{2,40})/i, format: (m) => `The user works ${clean(m[0].replace(/^i\s+work\s+/i, ""))}.` },
  { re: /\bi\s+prefer\s+([^.,!?\n]{2,40})/i, format: (m) => `The user prefers ${clean(m[1])}.` },
  { re: /\bi(?:'m| am)\s+(?:based|located)\s+in\s+([^.,!?\n]{2,40})/i, format: (m) => `The user is based in ${clean(m[1])}.` },
];

function clean(text: string, max = 80): string {
  return text.trim().replace(/\s+/g, " ").replace(/[.,;:!?]+$/, "").slice(0, max);
}

/** Signals the user is correcting Navo's last reply rather than just stating a
 *  new fact -- "no, actually...", "that's wrong, ...", etc. Kept separate from
 *  PATTERNS above since low recall matters even more here: a false positive
 *  would have Navo "remember" something that was never actually corrected. */
const CORRECTION_RE =
  /^(?:no|nope|nah|wrong|incorrect|that'?s\s+(?:wrong|incorrect|not\s+(?:right|correct))|actually|you'?re\s+wrong)\b[,.:]?\s+(.{4,200})/i;

/** Trims a prior reply down to a short cue -- just enough for the correction
 *  to make sense out of context later, not the whole reply. */
function briefly(text: string, max = 100): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

/**
 * Pulls a correction to Navo's own prior reply out of the user's message, if
 * they're plainly flagging one. The prior reply is folded in (briefly) so the
 * stored memory still means something later, out of the context it was made
 * in -- unlike extractMemories' facts, a bare correction ("no, it's Y") isn't
 * self-contained without knowing what it was correcting. Returns null if the
 * message doesn't read as a correction, or negates one (see extractMemories).
 */
export function extractCorrection(
  userText: string,
  priorAssistantText: string | null
): string | null {
  const match = userText.trim().match(CORRECTION_RE);
  if (!match) return null;

  const correction = clean(match[1], 160);
  if (correction.length < 4) return null;

  return priorAssistantText
    ? `Navo previously said "${briefly(priorAssistantText)}" -- the user corrected this: ${correction}.`
    : `The user corrected Navo: ${correction}.`;
}

/** Pull durable, user-stated facts out of a single user message. Pure and deterministic. */
export function extractMemories(userText: string): string[] {
  const facts: string[] = [];
  const sentences = userText.split(/(?<=[.!?\n])\s+/);
  for (const sentence of sentences) {
    if (NEGATION_RE.test(sentence) || TRANSIENT_RE.test(sentence)) continue;
    for (const pattern of PATTERNS) {
      const match = sentence.match(pattern.re);
      if (!match) continue;
      const fact = pattern.format(match).trim();
      if (fact.length > 3 && !facts.includes(fact)) facts.push(fact);
    }
  }
  return facts;
}

/** Format recalled memories for injection into the prompt, mirroring the notes block. */
export function buildMemoriesBlock(memories: string[]): string {
  if (memories.length === 0) return "";
  return `Things Navo already knows, including corrections made in past conversations:\n${memories.map((m) => `- ${m}`).join("\n")}\n\n`;
}

export function isMemoryEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(MEMORY_SETTING_KEY) !== "off";
}

export function setMemoryEnabled(on: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(MEMORY_SETTING_KEY, on ? "on" : "off");
}

/** The name to greet the user by: an explicit Settings value first (fast,
 *  always available), falling back to whatever "my name is"/"call me" already
 *  learned from chat -- so telling Navo your name once is enough either way. */
export async function getUserName(): Promise<string | null> {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(USER_NAME_KEY);
    if (stored) return stored;
  }
  const memories = await db.memories.orderBy("createdAt").reverse().toArray();
  for (const m of memories) {
    const match = m.text.match(NAME_MEMORY_RE);
    if (match) return match[1];
  }
  return null;
}

export function setUserName(name: string | null): void {
  if (typeof localStorage === "undefined") return;
  const trimmed = name?.trim();
  if (trimmed) localStorage.setItem(USER_NAME_KEY, trimmed);
  else localStorage.removeItem(USER_NAME_KEY);
}

/** Extract, embed, dedupe, and store any new memories from a user message,
 *  plus a correction to Navo's prior reply if the message reads as one (pass
 *  the reply it might be correcting via priorAssistantText). Meant to run
 *  after the reply streams, never on the path to the first token. */
export async function saveExtractedMemories(
  userText: string,
  priorAssistantText: string | null = null
): Promise<void> {
  const facts = extractMemories(userText);
  const correction = extractCorrection(userText, priorAssistantText);
  if (correction) facts.push(correction);
  if (facts.length === 0) return;

  const existing = await db.memories.toArray();
  for (const fact of facts) {
    const embedding = await embed(fact);
    const isDuplicate = existing.some(
      (m) => m.embedding && cosineSimilarity(embedding, m.embedding) > DEDUP_THRESHOLD
    );
    if (isDuplicate) continue;

    while (existing.length >= MAX_MEMORIES) {
      const oldest = existing.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
      await db.memories.delete(oldest.id);
      existing.splice(existing.indexOf(oldest), 1);
    }

    const createdAt = Date.now();
    const id = await db.memories.add({ text: fact, embedding, createdAt });
    existing.push({ id, text: fact, embedding, createdAt } as Memory);
  }
}

/** Recall the memories most relevant to the query, highest similarity first. */
export async function topRelevantMemories(
  query: string,
  k = 3,
  threshold = RETRIEVAL_THRESHOLD
): Promise<string[]> {
  const memories = await db.memories.toArray();
  if (memories.length === 0) return [];

  const queryEmbedding = await embed(query);
  return memories
    .filter((m): m is Memory & { embedding: number[] } => Array.isArray(m.embedding))
    .map((m) => ({ text: m.text, score: cosineSimilarity(queryEmbedding, m.embedding) }))
    .filter((m) => m.score > threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((m) => m.text);
}
