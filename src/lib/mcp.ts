export interface McpTool {
  name: string;
  description: string;
}

export interface McpServerDef {
  name: string;
  url: string;
}

/** Curated servers offered as one-tap adds in McpServersModal. Only list a
 *  server here after actually verifying it connects and lists tools --
 *  an unverified entry in a "curated" list is worse than no list at all. */
export const BUILTIN_MCP_SERVERS: McpServerDef[] = [
  { name: "DeepWiki", url: "https://mcp.deepwiki.com/mcp" },
  { name: "Context7 (library docs)", url: "https://mcp.context7.com/mcp" },
  { name: "GitMCP (any GitHub repo)", url: "https://gitmcp.io/docs" },
];

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return (body && typeof body.error === "string" && body.error) || fallback;
}

export async function listMcpTools(serverUrl: string): Promise<McpTool[]> {
  const res = await fetch("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "listTools", serverUrl }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to list tools"));
  const { tools } = (await res.json()) as { tools: McpTool[] };
  return tools;
}

export async function callMcpTool(
  serverUrl: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ text: string; isError: boolean }> {
  const res = await fetch("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "callTool", serverUrl, toolName, args }),
  });
  if (!res.ok) {
    return { text: await readErrorMessage(res, "Tool call failed"), isError: true };
  }
  return (await res.json()) as { text: string; isError: boolean };
}

// Deliberately matches any (or no) fence language, not just ```tool_call --
// verified live against Llama 3.2 1B, which reliably produced the right JSON
// shape but just as reliably ignored the "tag it tool_call" instruction and
// emitted a bare ``` fence instead. The JSON shape check below is what
// actually distinguishes a tool call from other fenced content, so the fence
// tag isn't load-bearing.
const TOOL_CALL_FENCE_RE = /```[a-zA-Z_]*\s*\n([\s\S]*?)\n```/g;

export interface ParsedToolCall {
  tool: string;
  args: Record<string, unknown>;
}

/**
 * Mirrors agentCode.ts's extractSolePythonBlock: returns the parsed
 * {tool, args} from a message's sole fenced code block, or null if there
 * isn't exactly one or the JSON inside doesn't have the expected shape.
 * Malformed JSON is treated as "no tool call" rather than thrown -- small
 * local models occasionally produce near-miss JSON, and that should fall
 * through to being shown as a normal reply rather than crashing the loop.
 */
export function extractSoleToolCall(text: string): ParsedToolCall | null {
  const matches = [...text.matchAll(TOOL_CALL_FENCE_RE)];
  if (matches.length !== 1) return null;
  try {
    const parsed = JSON.parse(matches[0][1]);
    if (typeof parsed?.tool === "string" && typeof parsed?.args === "object" && parsed.args !== null) {
      return { tool: parsed.tool, args: parsed.args };
    }
    return null;
  } catch {
    return null;
  }
}
