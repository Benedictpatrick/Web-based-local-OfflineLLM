const NUMBERED_LINE_RE = /^\d+[.)]\s+(.+)$/;

/**
 * Parses a model response as a clean numbered list of sub-questions, or
 * returns null if it isn't one. Every non-blank line must match the numbered
 * format -- unlike extractSolePythonBlock's tolerance for incidental prose,
 * this is intentionally all-or-nothing, since a response that's part list and
 * part rambling prose isn't a reliable decomposition to build sequential
 * research steps on. Callers should fall back to treating the original
 * question as the sole "sub-question" on null, not retry or coerce.
 */
export function extractNumberedList(text: string, maxItems = 5): string[] | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return null;

  const items: string[] = [];
  for (const line of lines) {
    const match = line.match(NUMBERED_LINE_RE);
    if (!match) return null;
    items.push(match[1].trim());
  }
  return items.slice(0, maxItems);
}

const MAX_CLARIFYING_QUESTION_LENGTH = 160;

/**
 * Parses a model response as a single short clarifying question, or returns
 * null if it isn't one (multi-line, doesn't end in "?", or too long to be a
 * single focused question). Used for the model-proposed topic-specific
 * clarifying question in Navo Research -- on null, the caller silently skips
 * it rather than showing a garbled or off-topic question to the user.
 */
export function extractSingleQuestion(text: string): string | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length !== 1) return null;

  const line = lines[0];
  if (!line.endsWith("?") || line.length > MAX_CLARIFYING_QUESTION_LENGTH) return null;
  return line;
}
