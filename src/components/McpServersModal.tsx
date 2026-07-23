"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { BUILTIN_MCP_SERVERS, listMcpTools, type McpTool } from "@/lib/mcp";
import { haptic } from "@/lib/haptics";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

/** Kept as its own component (rather than an inline arrow inside .map()) so
 *  the impure Date.now() call in handleAddServer, several layers down, isn't
 *  mis-flagged by the react-hooks purity check as happening during render --
 *  see the .map() callback below. */
function SuggestedServerButton({
  name,
  url,
  disabled,
  onAdd,
}: {
  name: string;
  url: string;
  disabled: boolean;
  onAdd: (name: string, url: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="rounded-xl border border-border px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      onClick={() => onAdd(name, url)}
    >
      {name}
      <span className="block text-xs font-normal text-foreground-muted">{url}</span>
    </button>
  );
}

export default function McpServersModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const servers = useLiveQuery(() => db.mcpServers.toArray(), [], []);
  const isOnline = useOnlineStatus();
  const [customUrl, setCustomUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [toolsById, setToolsById] = useState<
    Record<number, McpTool[] | "loading" | "error">
  >({});

  const enabledNamesAcrossServers = new Set(
    (servers ?? []).flatMap((s) => s.enabledTools.map((t) => t.name))
  );

  async function handleAddServer(name: string, url: string) {
    setAddError(null);
    try {
      await db.mcpServers.add({ name, url, createdAt: Date.now(), enabledTools: [] });
      haptic("tap");
    } catch {
      setAddError("Couldn't add that server.");
    }
  }

  async function handleAddCustom() {
    const url = customUrl.trim();
    if (!url) return;
    if (!/^https:\/\//.test(url)) {
      setAddError("Server URL must start with https://");
      return;
    }
    await handleAddServer(url, url);
    setCustomUrl("");
  }

  async function removeServer(id: number) {
    haptic("tap");
    await db.mcpServers.delete(id);
    if (expandedId === id) setExpandedId(null);
  }

  async function toggleExpand(server: { id: number; url: string }) {
    haptic("tap");
    if (expandedId === server.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(server.id);
    if (!toolsById[server.id]) {
      setToolsById((prev) => ({ ...prev, [server.id]: "loading" }));
      try {
        const tools = await listMcpTools(server.url);
        setToolsById((prev) => ({ ...prev, [server.id]: tools }));
      } catch {
        setToolsById((prev) => ({ ...prev, [server.id]: "error" }));
      }
    }
  }

  async function toggleTool(
    server: { id: number; enabledTools: { name: string; description: string }[] },
    tool: McpTool
  ) {
    haptic("tap");
    const isEnabled = server.enabledTools.some((t) => t.name === tool.name);
    const nextEnabled = isEnabled
      ? server.enabledTools.filter((t) => t.name !== tool.name)
      : [...server.enabledTools, { name: tool.name, description: tool.description }];
    await db.mcpServers.update(server.id, { enabledTools: nextEnabled });
  }

  function handleClose() {
    onClose();
    setAddError(null);
    setCustomUrl("");
  }

  const addedUrls = new Set((servers ?? []).map((s) => s.url));

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={handleClose}
      />
      <div
        className={`fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[80vh] max-w-sm -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-background p-5 shadow-lg transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        inert={!open}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Tool servers</h2>
          <button
            aria-label="Close"
            className="shrink-0 rounded-md p-1.5 text-foreground-muted hover:bg-surface hover:text-foreground"
            onClick={handleClose}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="mb-4 text-xs text-foreground-muted">
          Connect MCP tool servers the assistant can call. Pick which tools are enabled --
          only those are ever offered to the model. Every call still asks you to confirm
          before it runs.
        </p>

        {!isOnline && (
          <p className="mb-4 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-amber-500">
            You&apos;re offline -- adding servers or loading a tool list needs a connection.
            Already-enabled tools will resume working once you&apos;re back online.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {BUILTIN_MCP_SERVERS.filter((s) => !addedUrls.has(s.url)).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-foreground-muted">Suggested</p>
              <div className="flex flex-col gap-2">
                {BUILTIN_MCP_SERVERS.filter((s) => !addedUrls.has(s.url)).map((s) => (
                  <SuggestedServerButton
                    key={s.url}
                    name={s.name}
                    url={s.url}
                    disabled={!isOnline}
                    onAdd={handleAddServer}
                  />
                ))}
              </div>
            </div>
          )}

          {(servers ?? []).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-foreground-muted">Connected</p>
              <div className="flex flex-col gap-2">
                {(servers ?? []).map((server) => {
                  const tools = toolsById[server.id];
                  return (
                    <div key={server.id} className="rounded-xl border border-border">
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <button
                          type="button"
                          disabled={!isOnline && !tools}
                          className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => toggleExpand(server)}
                        >
                          <span className="block truncate text-sm font-medium">{server.name}</span>
                          <span className="block truncate text-xs text-foreground-muted">
                            {server.enabledTools.length > 0
                              ? `${server.enabledTools.length} tool${server.enabledTools.length === 1 ? "" : "s"} enabled`
                              : "No tools enabled"}
                          </span>
                        </button>
                        <button
                          aria-label={`Remove ${server.name}`}
                          className="shrink-0 rounded-md p-1.5 text-foreground-muted hover:bg-surface hover:text-red-500"
                          onClick={() => removeServer(server.id)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                      {expandedId === server.id && (
                        <div className="border-t border-border p-3">
                          {tools === "loading" && (
                            <p className="text-xs text-foreground-muted">Loading tools…</p>
                          )}
                          {tools === "error" && (
                            <p className="text-xs text-red-500">Couldn&apos;t reach this server.</p>
                          )}
                          {tools && tools !== "loading" && tools !== "error" && tools.length === 0 && (
                            <p className="text-xs text-foreground-muted">This server has no tools.</p>
                          )}
                          {tools && tools !== "loading" && tools !== "error" && tools.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              {tools.map((tool) => {
                                const isEnabled = server.enabledTools.some(
                                  (t) => t.name === tool.name
                                );
                                const collides =
                                  !isEnabled && enabledNamesAcrossServers.has(tool.name);
                                return (
                                  <label
                                    key={tool.name}
                                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2 py-1.5 transition-colors ${
                                      isEnabled
                                        ? "border-accent bg-accent/10"
                                        : "border-border hover:bg-surface"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="mt-0.5"
                                      checked={isEnabled}
                                      onChange={() => toggleTool(server, tool)}
                                    />
                                    <span className="min-w-0">
                                      <span className="block text-xs font-medium">{tool.name}</span>
                                      {tool.description && (
                                        <span className="block text-xs text-foreground-muted">
                                          {tool.description}
                                        </span>
                                      )}
                                      {collides && (
                                        <span className="block text-xs text-amber-500">
                                          Another enabled tool is also named this -- the model may
                                          call the wrong one.
                                        </span>
                                      )}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium text-foreground-muted">Add a custom server</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com/mcp"
                disabled={!isOnline}
                className="w-full min-w-0 rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-40"
              />
              <button
                type="button"
                disabled={!isOnline}
                className="shrink-0 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={handleAddCustom}
              >
                Add
              </button>
            </div>
            {addError && <p className="mt-1 text-xs text-red-500">{addError}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
