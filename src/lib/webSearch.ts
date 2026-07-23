export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchOutcome {
  /** Pre-formatted block ready to drop into a system prompt, "" if nothing came back. */
  contextBlock: string;
  sources: { title: string; url: string }[];
}

const EMPTY: WebSearchOutcome = { contextBlock: "", sources: [] };

/**
 * Calls the same-origin /api/websearch proxy (see that route for why DuckDuckGo
 * can't be hit directly from the browser) and degrades to no results on any
 * failure -- a broken web search should never break the research pipeline.
 */
export async function searchWeb(query: string): Promise<WebSearchOutcome> {
  try {
    const res = await fetch(`/api/websearch?q=${encodeURIComponent(query)}`);
    if (!res.ok) return EMPTY;

    const { results } = (await res.json()) as { results: WebSearchResult[] };
    if (!results || results.length === 0) return EMPTY;

    const contextBlock = `Web search results for "${query}":\n${results
      .map((r, i) => `${i + 1}. ${r.title} — ${r.snippet} (${r.url})`)
      .join("\n")}\n\n`;

    return { contextBlock, sources: results.map((r) => ({ title: r.title, url: r.url })) };
  } catch {
    return EMPTY;
  }
}
