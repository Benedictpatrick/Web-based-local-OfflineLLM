import { describe, expect, it } from "vitest";
import { normalizeMathDelimiters } from "./MarkdownMessage";

describe("normalizeMathDelimiters", () => {
  it("escapes a currency range so remark-math doesn't swallow the dollar signs", () => {
    const input = "Solar: $3,500 - $5,000 per kilowatt";
    expect(normalizeMathDelimiters(input)).toBe("Solar: \\$3,500 - \\$5,000 per kilowatt");
  });

  it("escapes multiple independent currency pairs in the same message", () => {
    const input = "Solar: $3,500 - $5,000\nWind: $2,500 - $4,000";
    expect(normalizeMathDelimiters(input)).toBe(
      "Solar: \\$3,500 - \\$5,000\nWind: \\$2,500 - \\$4,000"
    );
  });

  it("leaves a lone unpaired currency mention untouched", () => {
    const input = "It costs $50 total.";
    expect(normalizeMathDelimiters(input)).toBe("It costs $50 total.");
  });

  it("leaves genuine LaTeX inline math untouched", () => {
    const input = "The answer is $x^2 + 1$ for all x.";
    expect(normalizeMathDelimiters(input)).toBe("The answer is $x^2 + 1$ for all x.");
  });

  it("leaves genuine LaTeX fraction math untouched", () => {
    const input = "Half is $\\frac{1}{2}$ of the whole.";
    expect(normalizeMathDelimiters(input)).toBe("Half is $\\frac{1}{2}$ of the whole.");
  });

  it("does not touch dollar signs inside code spans or code blocks", () => {
    const input = "Use `$3,500 - $5,000` as a placeholder.";
    expect(normalizeMathDelimiters(input)).toBe(input);
  });

  it("still converts \\(...\\) and \\[...\\] LaTeX delimiters", () => {
    expect(normalizeMathDelimiters("Inline \\(x+1\\) math.")).toBe("Inline $x+1$ math.");
    expect(normalizeMathDelimiters("Block \\[x+1\\] math.")).toContain("$$\nx+1\n$$");
  });
});
