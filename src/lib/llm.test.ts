import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadStalledError, STALL_TIMEOUT_MS, withStallWatchdog } from "./llm";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "performance"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("withStallWatchdog", () => {
  it("rejects with LoadStalledError when the promise makes no progress", async () => {
    const hang = withStallWatchdog(() => new Promise(() => {}));
    hang.catch(() => {});

    // +3s clears both the strict-inequality boundary and the watchdog's 2s
    // poll granularity, so the rejecting tick is guaranteed to fire within
    // this window (see the off-by-one this caught: +1s landed exactly on a
    // tick where elapsed === threshold, which is not "stalled" yet, and the
    // next tick that would trip it fell just outside the advanced window).
    await vi.advanceTimersByTimeAsync(STALL_TIMEOUT_MS + 3000);

    let error: unknown;
    try {
      await hang;
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(LoadStalledError);
  });

  it("does not stall while touch() is called before the timeout elapses", async () => {
    let resolveRun: (value: string) => void;
    const result = withStallWatchdog((touch) => {
      const intervalId = setInterval(touch, STALL_TIMEOUT_MS / 2);
      return new Promise<string>((resolve) => {
        resolveRun = (value) => {
          clearInterval(intervalId);
          resolve(value);
        };
      });
    });

    // Advance well past STALL_TIMEOUT_MS in total, but touch() keeps firing
    // more often than the stall threshold, so it must never reject.
    await vi.advanceTimersByTimeAsync(STALL_TIMEOUT_MS * 3);
    resolveRun!("done");
    await expect(result).resolves.toBe("done");
  });

  it("resolves normally when the promise finishes before any stall check", async () => {
    const result = withStallWatchdog(() => Promise.resolve("fast"));
    await expect(result).resolves.toBe("fast");
  });
});
