import { describe, expect, it, vi } from "vitest";
import { cosineSimilarity, embed } from "./embeddings";

const extractorMock = vi.fn(async (text: string) => ({ data: new Float32Array([text.length]) }));
const pipelineMock = vi.fn(async () => extractorMock);
vi.mock("@huggingface/transformers", () => ({ pipeline: (...a: unknown[]) => pipelineMock(...(a as [])) }));

describe("embed", () => {
  it("runs the model once for the same text, even when asked concurrently", async () => {
    extractorMock.mockClear();
    const [a, b, c] = await Promise.all([embed("same query"), embed("same query"), embed("same query")]);

    expect(extractorMock).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it("still embeds different text separately", async () => {
    extractorMock.mockClear();
    await embed("first different");
    await embed("second different one");

    expect(extractorMock).toHaveBeenCalledTimes(2);
  });

  it("does not keep a failed embedding cached", async () => {
    extractorMock.mockClear();
    extractorMock.mockRejectedValueOnce(new Error("offline"));

    await expect(embed("flaky text")).rejects.toThrow("offline");
    await expect(embed("flaky text")).resolves.toEqual([10]);
  });
});

describe("cosineSimilarity", () => {
  it("is 1 for identical normalized vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
  });

  it("is 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("is -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it("matches the dot product for arbitrary normalized vectors", () => {
    const a = [0.6, 0.8];
    const b = [0.8, 0.6];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.6 * 0.8 + 0.8 * 0.6);
  });
});
