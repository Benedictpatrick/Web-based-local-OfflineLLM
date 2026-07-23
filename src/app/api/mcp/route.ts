import type { NextRequest } from "next/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const dynamic = "force-dynamic";

type McpRequestBody =
  | { action: "listTools"; serverUrl: string }
  | { action: "callTool"; serverUrl: string; toolName: string; args: Record<string, unknown> };

const LIST_TIMEOUT_MS = 8000;
// Covers connect handshake + the remote tool's own execution time, which can
// run considerably longer than a metadata-only listTools call.
const CALL_TIMEOUT_MS = 30000;
const MAX_RESULT_CHARS = 4000;
// Some real servers (e.g. Context7) ship multi-paragraph tool descriptions
// meant for a full-size model's context window -- verified live. Truncating
// here keeps every consumer (the enable/disable checklist, and the prompt
// built for small WASM-tier models) working from the same short text rather
// than each needing its own cap.
const MAX_TOOL_DESCRIPTION_CHARS = 200;

function truncateDescription(description: string): string {
  const oneLine = description.replace(/\s+/g, " ").trim();
  return oneLine.length > MAX_TOOL_DESCRIPTION_CHARS
    ? oneLine.slice(0, MAX_TOOL_DESCRIPTION_CHARS - 1).trimEnd() + "…"
    : oneLine;
}

function rejectAfter(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
}

function extractTextContent(result: unknown): string {
  const content = (result as { content?: unknown })?.content;
  if (!Array.isArray(content) || content.length === 0) return "(no content returned)";
  return content
    .map((c: { type?: string; text?: string }) =>
      c.type === "text" && c.text ? c.text : `[${c.type ?? "unknown"} content omitted]`
    )
    .join("\n");
}

/**
 * Proxies MCP servers server-side: a browser page can't fetch arbitrary
 * remote MCP servers directly (no CORS on most of them, and they're built to
 * be called by a host process, not a page), so the client lives here instead,
 * same reasoning as the DuckDuckGo proxy in ../websearch/route.ts. Connects
 * fresh per request rather than holding a session open.
 */
export async function POST(request: NextRequest) {
  let body: McpRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body?.serverUrl || !/^https:\/\//.test(body.serverUrl)) {
    return Response.json({ error: "Server URL must be https" }, { status: 400 });
  }

  const timeoutMs = body.action === "listTools" ? LIST_TIMEOUT_MS : CALL_TIMEOUT_MS;
  const client = new Client({ name: "navo", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(body.serverUrl));

  try {
    await Promise.race([client.connect(transport), rejectAfter(timeoutMs, "Connection timed out")]);

    if (body.action === "listTools") {
      const { tools } = await Promise.race([
        client.listTools(),
        rejectAfter(timeoutMs, "listTools timed out"),
      ]);
      return Response.json({
        tools: tools.map((t) => ({ name: t.name, description: truncateDescription(t.description ?? "") })),
      });
    }

    const result = await Promise.race([
      client.callTool({ name: body.toolName, arguments: body.args }),
      rejectAfter(timeoutMs, "Tool call timed out"),
    ]);
    const text = extractTextContent(result).slice(0, MAX_RESULT_CHARS);
    return Response.json({ text, isError: !!result.isError });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 502 });
  } finally {
    await client.close().catch(() => {});
  }
}
