import { beforeEach, describe, expect, it } from "vitest";
import {
  clearInflightReply,
  readDraftInput,
  readInflightReply,
  writeDraftInput,
  writeInflightReply,
} from "./refreshRecovery";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
}

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
});

describe("inflight reply", () => {
  it("round-trips a written entry", () => {
    writeInflightReply({ conversationId: 7, text: "partial answ", updatedAt: 123 });
    expect(readInflightReply()).toEqual({ conversationId: 7, text: "partial answ", updatedAt: 123 });
  });

  it("returns null when nothing was written", () => {
    expect(readInflightReply()).toBeNull();
  });

  it("clears the entry", () => {
    writeInflightReply({ conversationId: 1, text: "x", updatedAt: 1 });
    clearInflightReply();
    expect(readInflightReply()).toBeNull();
  });

  it("ignores corrupted JSON instead of throwing", () => {
    localStorage.setItem("navo-inflight-reply", "{not json");
    expect(readInflightReply()).toBeNull();
  });

  it("ignores a malformed entry missing expected fields", () => {
    localStorage.setItem("navo-inflight-reply", JSON.stringify({ text: "no conversationId" }));
    expect(readInflightReply()).toBeNull();
  });
});

describe("draft input", () => {
  it("round-trips a written draft", () => {
    writeDraftInput("hello there");
    expect(readDraftInput()).toBe("hello there");
  });

  it("returns empty string when nothing was written", () => {
    expect(readDraftInput()).toBe("");
  });

  it("removes the entry when written with an empty string", () => {
    writeDraftInput("something");
    writeDraftInput("");
    expect(readDraftInput()).toBe("");
    expect(localStorage.getItem("navo-draft-input")).toBeNull();
  });
});
