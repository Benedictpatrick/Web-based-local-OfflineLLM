import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Memory } from "./db";

const embedMock = vi.hoisted(() => vi.fn<(text: string) => Promise<number[]>>());
const memoriesStore = vi.hoisted(() => ({ rows: [] as Memory[], nextId: 1 }));

vi.mock("./embeddings", async () => {
  const actual = await vi.importActual<typeof import("./embeddings")>("./embeddings");
  return { ...actual, embed: embedMock };
});

vi.mock("./db", () => ({
  db: {
    memories: {
      toArray: async () => memoriesStore.rows.slice(),
      add: async (row: Omit<Memory, "id">) => {
        const id = memoriesStore.nextId++;
        memoriesStore.rows.push({ ...row, id });
        return id;
      },
      delete: async (id: number) => {
        memoriesStore.rows = memoriesStore.rows.filter((r) => r.id !== id);
      },
    },
  },
}));

import {
  extractMemories,
  buildMemoriesBlock,
  saveExtractedMemories,
  topRelevantMemories,
} from "./memory";

beforeEach(() => {
  embedMock.mockReset();
  memoriesStore.rows = [];
  memoriesStore.nextId = 1;
});

describe("extractMemories", () => {
  it("captures a stated name", () => {
    expect(extractMemories("Hi, my name is Alice")).toEqual(["The user's name is Alice."]);
  });

  it("captures what the user is studying", () => {
    expect(extractMemories("I'm studying operating systems this term")).toEqual([
      "The user is studying operating systems this term.",
    ]);
  });

  it("ignores negated statements so a false fact isn't stored", () => {
    expect(extractMemories("I'm not studying biology anymore")).toEqual([]);
  });

  it("ignores transient statements", () => {
    expect(extractMemories("I'm studying for the exam tonight")).toEqual([]);
  });

  it("returns nothing for small talk", () => {
    expect(extractMemories("hey there, how's it going?")).toEqual([]);
  });
});

describe("buildMemoriesBlock", () => {
  it("is empty when there is nothing to recall", () => {
    expect(buildMemoriesBlock([])).toBe("");
  });

  it("formats recalled memories as a labelled list", () => {
    expect(buildMemoriesBlock(["The user's name is Alice."])).toContain(
      "- The user's name is Alice."
    );
  });
});

describe("store to recall seam", () => {
  it("saves an extracted fact and recalls it for a related query", async () => {
    // Orthogonal-ish embeddings: "name" facts and queries align, unrelated ones don't.
    embedMock.mockImplementation(async (text: string) =>
      /name|alice/i.test(text) ? [1, 0] : [0, 1]
    );

    await saveExtractedMemories("my name is Alice");
    expect(memoriesStore.rows).toHaveLength(1);

    const recalled = await topRelevantMemories("what is my name again?");
    expect(recalled).toEqual(["The user's name is Alice."]);
    expect(buildMemoriesBlock(recalled)).toContain("The user's name is Alice.");
  });

  it("does not recall memories unrelated to the query", async () => {
    embedMock.mockImplementation(async (text: string) =>
      /name|alice/i.test(text) ? [1, 0] : [0, 1]
    );

    await saveExtractedMemories("my name is Alice");
    const recalled = await topRelevantMemories("explain quicksort");
    expect(recalled).toEqual([]);
  });

  it("skips a near-duplicate memory on save", async () => {
    embedMock.mockResolvedValue([1, 0]);

    await saveExtractedMemories("my name is Alice");
    await saveExtractedMemories("my name is Alice");
    expect(memoriesStore.rows).toHaveLength(1);
  });
});
