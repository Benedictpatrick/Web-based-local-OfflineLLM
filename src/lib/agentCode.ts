const SOLE_PY_BLOCK_RE = /^```(?:python|py)\s*\n((?:(?!```)[\s\S])*)\n```$/;

/**
 * Returns the code inside a message that consists of exactly one fenced
 * python code block and nothing else, or null otherwise. Used to detect
 * when a model response is "run this for me" rather than a normal answer.
 */
export function extractSolePythonBlock(text: string): string | null {
  const match = SOLE_PY_BLOCK_RE.exec(text.trim());
  return match ? match[1] : null;
}
