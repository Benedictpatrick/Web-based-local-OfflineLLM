import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";

const DB_NAME = "offline-llm-app";

function deleteDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

afterEach(async () => {
  vi.resetModules();
  await deleteDb();
});

describe("db schema", () => {
  it("opens a fresh database at the current version with every table available", async () => {
    const { db } = await import("./db");
    await db.open();
    expect(db.verno).toBe(4);
    expect(await db.chat.count()).toBe(0);
    expect(await db.conversations.count()).toBe(0);
    expect(await db.memories.count()).toBe(0);
    expect(await db.mcpServers.count()).toBe(0);
    db.close();
  });
});

describe("db v1 -> v2 migration (chat history -> conversations)", () => {
  /** Seeds a database at the pre-conversations (v1) schema, bypassing db.ts's
   *  own version chain, the way a real installed user's browser would have
   *  it before upgrading to a build that adds `conversations`. */
  async function seedLegacyChat(
    rows: { role: "user" | "assistant"; content: string; createdAt: number }[]
  ) {
    const legacy = new Dexie(DB_NAME);
    legacy.version(1).stores({ journal: "++id, createdAt", chat: "++id, createdAt" });
    await legacy.open();
    if (rows.length > 0) await legacy.table("chat").bulkAdd(rows);
    legacy.close();
  }

  it("groups existing messages into one synthesized conversation, preserving every message", async () => {
    await seedLegacyChat([
      { role: "user", content: "hello there", createdAt: 1000 },
      { role: "assistant", content: "hi, how can I help?", createdAt: 1001 },
      { role: "user", content: "a second question", createdAt: 2000 },
    ]);

    const { db } = await import("./db");
    await db.open();

    const messages = await db.chat.orderBy("createdAt").toArray();
    expect(messages).toHaveLength(3);
    expect(messages.map((m) => m.content)).toEqual([
      "hello there",
      "hi, how can I help?",
      "a second question",
    ]);
    expect(messages.every((m) => typeof m.conversationId === "number")).toBe(true);

    const conversations = await db.conversations.toArray();
    expect(conversations).toHaveLength(1);
    expect(conversations[0].title).toBe("hello there");
    expect(conversations[0].createdAt).toBe(1000);
    expect(conversations[0].updatedAt).toBe(2000);
    expect(messages.every((m) => m.conversationId === conversations[0].id)).toBe(true);

    db.close();
  });

  it("titles the synthesized conversation from the first user message, not an earlier assistant one", async () => {
    await seedLegacyChat([
      { role: "assistant", content: "welcome!", createdAt: 500 },
      { role: "user", content: "what can you do?", createdAt: 600 },
    ]);

    const { db } = await import("./db");
    await db.open();
    const [conversation] = await db.conversations.toArray();
    expect(conversation.title).toBe("what can you do?");
    db.close();
  });

  it("does not create a conversation when there is no legacy chat history", async () => {
    await seedLegacyChat([]);

    const { db } = await import("./db");
    await db.open();
    expect(await db.conversations.count()).toBe(0);
    db.close();
  });
});
