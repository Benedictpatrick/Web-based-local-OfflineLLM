import { db, type JournalEntry } from "./db";
import { cosineSimilarity, embed } from "./embeddings";

const SIMILARITY_THRESHOLD = 0.3;

async function embeddingFor(entry: JournalEntry): Promise<number[]> {
  if (entry.embedding) return entry.embedding;
  const embedding = await embed(entry.text);
  await db.journal.update(entry.id, { embedding });
  return embedding;
}

export async function topRelevantEntries(
  query: string,
  entries: JournalEntry[],
  k = 3,
  threshold = SIMILARITY_THRESHOLD
): Promise<JournalEntry[]> {
  if (entries.length === 0) return [];

  const queryEmbedding = await embed(query);
  const scored = await Promise.all(
    entries.map(async (entry) => ({
      entry,
      score: cosineSimilarity(queryEmbedding, await embeddingFor(entry)),
    }))
  );

  return scored
    .filter((s) => s.score > threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.entry);
}

export interface TextChunk {
  text: string;
  embedding: number[];
}

export async function embedChunks(texts: string[]): Promise<TextChunk[]> {
  return Promise.all(texts.map(async (text) => ({ text, embedding: await embed(text) })));
}

export async function topRelevantChunks(
  query: string,
  chunks: TextChunk[],
  k = 3,
  threshold = SIMILARITY_THRESHOLD
): Promise<string[]> {
  if (chunks.length === 0) return [];

  const queryEmbedding = await embed(query);
  return chunks
    .map((c) => ({ text: c.text, score: cosineSimilarity(queryEmbedding, c.embedding) }))
    .filter((c) => c.score > threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((c) => c.text);
}
