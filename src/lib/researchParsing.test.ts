import { describe, expect, it } from "vitest";
import { extractNumberedList, extractSingleQuestion } from "./researchParsing";

describe("extractNumberedList", () => {
  it("parses a clean numbered list", () => {
    const text = "1. First sub-question\n2. Second sub-question\n3. Third sub-question";
    expect(extractNumberedList(text)).toEqual([
      "First sub-question",
      "Second sub-question",
      "Third sub-question",
    ]);
  });

  it("accepts a trailing parenthesis style too", () => {
    const text = "1) One\n2) Two";
    expect(extractNumberedList(text)).toEqual(["One", "Two"]);
  });

  it("tolerates surrounding blank lines", () => {
    const text = "\n\n1. One\n\n2. Two\n\n";
    expect(extractNumberedList(text)).toEqual(["One", "Two"]);
  });

  it("returns null when any line isn't a numbered item (mixed prose)", () => {
    const text = "Here are some sub-questions:\n1. One\n2. Two";
    expect(extractNumberedList(text)).toBeNull();
  });

  it("returns null for a plain paragraph with no list", () => {
    expect(extractNumberedList("This is just a regular answer, no list here.")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(extractNumberedList("")).toBeNull();
    expect(extractNumberedList("   \n  \n ")).toBeNull();
  });

  it("caps the result at maxItems", () => {
    const text = "1. A\n2. B\n3. C\n4. D\n5. E";
    expect(extractNumberedList(text, 2)).toEqual(["A", "B"]);
  });
});

describe("extractSingleQuestion", () => {
  it("accepts a single short question line", () => {
    expect(extractSingleQuestion("Are you interested in the hardware or the algorithms?")).toBe(
      "Are you interested in the hardware or the algorithms?"
    );
  });

  it("tolerates surrounding blank lines", () => {
    expect(extractSingleQuestion("\n\nWhat time period should I focus on?\n\n")).toBe(
      "What time period should I focus on?"
    );
  });

  it("returns null for multi-line output", () => {
    const text = "Sure, here's a question:\nWhat time period should I focus on?";
    expect(extractSingleQuestion(text)).toBeNull();
  });

  it("returns null when the line doesn't end in a question mark", () => {
    expect(extractSingleQuestion("I think you should focus on the hardware side.")).toBeNull();
  });

  it("returns null for an overly long line", () => {
    const long = "Why".repeat(80) + "?";
    expect(extractSingleQuestion(long)).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(extractSingleQuestion("")).toBeNull();
  });
});
