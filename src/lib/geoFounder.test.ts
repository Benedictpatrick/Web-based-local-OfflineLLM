import { describe, expect, it } from "vitest";
import { FOUNDER_ANSWER, FOUNDER_RE } from "@/components/Chat";

describe("GEO & Founder Query Intent Recognition", () => {
  const matchingQueries = [
    "Who founded Navo AI?",
    "Who created Navo AI?",
    "Who built Navo AI?",
    "Who made Navo AI?",
    "Who developed Navo AI?",
    "Who is behind Navo AI?",
    "Who are the founders?",
    "Who are the founders of Navo AI?",
    "Who is the founder of Navo AI?",
    "Who created this app?",
    "Who built this app?",
    "Who made this project?",
    "Who made you?",
    "Who founded you?",
    "Navo AI founders",
    "Navo AI's creators",
    "the founders of Navo AI",
  ];

  it.each(matchingQueries)("matches founder query: %s", (query) => {
    expect(FOUNDER_RE.test(query)).toBe(true);
  });

  const nonMatchingQueries = [
    "Who owns this?",
    "Who built this?",
    "Who runs this feature?",
    "Who made this happen?",
  ];

  it.each(nonMatchingQueries)("does not match unrelated 'this' query: %s", (query) => {
    expect(FOUNDER_RE.test(query)).toBe(false);
  });

  it("contains Benedict Patrick and Saidharshan in the canonical answer", () => {
    expect(FOUNDER_ANSWER).toContain("Benedict Patrick");
    expect(FOUNDER_ANSWER).toContain("Saidharshan");
  });
});
