import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

const MAX_RESULTS = 5;
const MAX_QUERY_LENGTH = 300;

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).trim();
}

function extractRealUrl(ddgHref: string): string | null {
  try {
    const url = new URL(decodeEntities(ddgHref), "https://duckduckgo.com");
    const uddg = url.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : url.toString();
  } catch {
    return null;
  }
}

/**
 * Proxies DuckDuckGo's no-JS HTML results page. That endpoint has no CORS
 * headers and DuckDuckGo's JS-required lite/html pages actively challenge
 * scripted requests without a real browser session, so this has to run
 * server-side; the official JSON API (api.duckduckgo.com) only returns
 * instant-answer boxes, not general web results, so it's not a substitute.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, MAX_QUERY_LENGTH);
  if (!q) {
    return Response.json({ results: [] satisfies WebSearchResult[] });
  }

  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return Response.json({ results: [] satisfies WebSearchResult[] });

    const html = await res.text();

    const titles: { url: string; title: string }[] = [];
    const titleRe = /<a rel="nofollow" class="result__a" href="([^"]+)">([\s\S]*?)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = titleRe.exec(html)) && titles.length < MAX_RESULTS) {
      const url = extractRealUrl(m[1]);
      if (url) titles.push({ url, title: stripTags(m[2]) });
    }

    const snippets: string[] = [];
    const snippetRe = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    while ((m = snippetRe.exec(html)) && snippets.length < MAX_RESULTS) {
      snippets.push(stripTags(m[1]));
    }

    const results: WebSearchResult[] = titles.map((t, i) => ({
      title: t.title,
      url: t.url,
      snippet: snippets[i] ?? "",
    }));

    return Response.json({ results });
  } catch {
    return Response.json({ results: [] satisfies WebSearchResult[] });
  }
}
