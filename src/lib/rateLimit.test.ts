import { describe, expect, it } from "vitest";
import { clientIp, isRateLimited } from "./rateLimit";

describe("isRateLimited", () => {
  it("allows requests up to the limit, then blocks", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(isRateLimited(key, 3)).toBe(false);
    }
    expect(isRateLimited(key, 3)).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const a = `test-a-${Math.random()}`;
    const b = `test-b-${Math.random()}`;
    for (let i = 0; i < 2; i++) isRateLimited(a, 2);
    expect(isRateLimited(b, 2)).toBe(false);
  });
});

describe("clientIp", () => {
  it("reads the first address out of a comma-separated x-forwarded-for", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientIp(request)).toBe("1.2.3.4");
  });

  it("falls back to 'unknown' when the header is absent", () => {
    const request = new Request("https://example.com");
    expect(clientIp(request)).toBe("unknown");
  });
});
