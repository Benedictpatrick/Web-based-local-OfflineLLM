import { describe, expect, it, vi, beforeEach } from "vitest";

// generateOnce schedules its streaming flush via requestAnimationFrame, which
// only exists in browsers/jsdom, not plain Node -- polyfill it so the
// streaming loop can run to completion in this test environment.
globalThis.requestAnimationFrame ??= ((cb: FrameRequestCallback) => {
  setTimeout(() => cb(performance.now()), 0);
  return 0;
}) as typeof requestAnimationFrame;

const GARBLED_TEXT =
  "മി Walling പരിശോധ موقع destinada Metab Shannon kapan ross consular agner bay பச்சை " +
  "alte syk frauencalorieerce sympathies stai HoodILA throng नांद mutationAttachment precision " +
  "принци イタリア Bihstonesstrictionを持つ shillings disposable Therapeutic членыbrokersInBackgroundaske말로GRANTED";

const CLEAN_TEXT = "Hello! It's lovely to be here. How about we chat a bit?";

const streamChatMock = vi.fn();

vi.mock("./llm", () => ({
  streamChat: (...args: unknown[]) => streamChatMock(...args),
  abortGeneration: vi.fn(),
  isAbortError: () => false,
  isEngineLostError: () => false,
}));

async function* chunksOf(text: string) {
  for (const chunk of text.match(/.{1,20}/g) ?? []) {
    yield chunk;
  }
}

describe("generateOnce garbled-output retry", () => {
  beforeEach(() => {
    streamChatMock.mockReset();
  });

  it("silently retries once when the first attempt looks garbled, and keeps the clean retry", async () => {
    streamChatMock.mockReturnValueOnce(chunksOf(GARBLED_TEXT));
    streamChatMock.mockReturnValueOnce(chunksOf(CLEAN_TEXT));

    const { generateOnce } = await import("./generation");
    const { text } = await generateOnce([{ role: "user", content: "Hi" }]);

    expect(streamChatMock).toHaveBeenCalledTimes(2);
    expect(text).toBe(CLEAN_TEXT);
  });

  it("accepts a second garbled attempt rather than retrying forever", async () => {
    streamChatMock.mockReturnValueOnce(chunksOf(GARBLED_TEXT));
    streamChatMock.mockReturnValueOnce(chunksOf(GARBLED_TEXT));

    const { generateOnce } = await import("./generation");
    const { text } = await generateOnce([{ role: "user", content: "Hi" }]);

    expect(streamChatMock).toHaveBeenCalledTimes(2);
    expect(text).toBe(GARBLED_TEXT);
  });

  it("does not retry when the first attempt is already coherent", async () => {
    streamChatMock.mockReturnValueOnce(chunksOf(CLEAN_TEXT));

    const { generateOnce } = await import("./generation");
    const { text } = await generateOnce([{ role: "user", content: "Hi" }]);

    expect(streamChatMock).toHaveBeenCalledTimes(1);
    expect(text).toBe(CLEAN_TEXT);
  });
});

describe("generateOnce streaming updates", () => {
  beforeEach(() => {
    streamChatMock.mockReset();
  });

  it("hands the UI far fewer updates than chunks, ending on the full text", async () => {
    const words = Array.from({ length: 200 }, (_, i) => `word${i} `);
    streamChatMock.mockReturnValueOnce(
      (async function* () {
        for (const w of words) yield w;
      })()
    );
    const seen: string[] = [];

    const { generateOnce } = await import("./generation");
    const { text } = await generateOnce([{ role: "user", content: "Hi" }], {
      onDelta: (t) => seen.push(t),
    });

    expect(text).toBe(words.join(""));
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.length).toBeLessThan(words.length / 4);
    expect(seen[seen.length - 1]).toBe(text);
  });

  it("does not deliver any update after it has returned", async () => {
    streamChatMock.mockReturnValueOnce(chunksOf(CLEAN_TEXT));
    let returned = false;
    let lateCalls = 0;

    const { generateOnce } = await import("./generation");
    await generateOnce([{ role: "user", content: "Hi" }], {
      onDelta: () => {
        if (returned) lateCalls++;
      },
    });
    returned = true;
    await new Promise((r) => setTimeout(r, 200));

    expect(lateCalls).toBe(0);
  });
});

