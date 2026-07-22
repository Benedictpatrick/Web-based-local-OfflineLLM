import type { ChatCompletionMessage } from "@wllama/wllama/esm/index.js";
import { describe, expect, it, vi } from "vitest";
import { decomposeQuestion, proposeClarifyingQuestion, runResearch, type GenerateOnceFn } from "./research";

function fakeGenerate(...responses: string[]): GenerateOnceFn & ReturnType<typeof vi.fn> {
  let call = 0;
  return vi.fn(async (_messages: ChatCompletionMessage[]) => ({
    text: responses[Math.min(call++, responses.length - 1)],
    aborted: false,
  }));
}

describe("decomposeQuestion", () => {
  it("parses a clean numbered list into sub-questions", async () => {
    const generate = fakeGenerate("1. Sub one\n2. Sub two");
    expect(await decomposeQuestion("quantum computing", generate)).toEqual([
      "Sub one",
      "Sub two",
    ]);
  });

  it("falls back to the raw topic when the response isn't a parseable list", async () => {
    const generate = fakeGenerate("Sure! Quantum computing is a big topic, let me explain...");
    expect(await decomposeQuestion("quantum computing", generate)).toEqual(["quantum computing"]);
  });
});

describe("proposeClarifyingQuestion", () => {
  it("returns the question when the model proposes a clean single line", async () => {
    const generate = fakeGenerate("Are you interested in hardware or algorithms?");
    expect(await proposeClarifyingQuestion("quantum computing", generate)).toBe(
      "Are you interested in hardware or algorithms?"
    );
  });

  it("returns null when the model says none is needed", async () => {
    const generate = fakeGenerate("none");
    expect(await proposeClarifyingQuestion("quantum computing", generate)).toBeNull();
  });

  it("returns null when the response doesn't parse as a single question", async () => {
    const generate = fakeGenerate("Well, there are many angles to consider here...");
    expect(await proposeClarifyingQuestion("quantum computing", generate)).toBeNull();
  });
});

describe("runResearch", () => {
  it("quick depth skips decomposition and runs a single pass with no synthesis section", async () => {
    const generate = fakeGenerate("Quantum computing uses qubits instead of classical bits.");
    const starts: number[] = [];
    const dones: number[] = [];

    const { transcript } = await runResearch({
      topic: "quantum computing",
      depth: "quick",
      contextBlock: "",
      generate,
      onSubQuestionStart: (i) => starts.push(i),
      onSubQuestionDone: (i) => dones.push(i),
    });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(transcript).toBe("Quantum computing uses qubits instead of classical bits.");
    expect(transcript).not.toContain("### Summary");
    expect(starts).toEqual([0]);
    expect(dones).toEqual([0]);
  });

  it("deep depth decomposes, answers each sub-question sequentially, then synthesizes", async () => {
    const generate = fakeGenerate(
      "1. Hardware\n2. Algorithms", // decomposition
      "Superconducting qubits are the leading hardware approach.", // sub-answer 1
      "Shor's and Grover's algorithms are the best-known quantum algorithms.", // sub-answer 2
      "Quantum computing spans both hardware (qubits) and algorithms (Shor's, Grover's)." // synthesis
    );
    const starts: { i: number; q: string }[] = [];
    const dones: number[] = [];

    const { transcript } = await runResearch({
      topic: "quantum computing",
      depth: "deep",
      contextBlock: "",
      generate,
      onSubQuestionStart: (i, q) => starts.push({ i, q }),
      onSubQuestionDone: (i) => dones.push(i),
    });

    expect(generate).toHaveBeenCalledTimes(4); // decompose + 2 sub-answers + synthesis
    expect(starts).toEqual([
      { i: 0, q: "Hardware" },
      { i: 1, q: "Algorithms" },
    ]);
    expect(dones).toEqual([0, 1]);
    expect(transcript).toContain("### Hardware");
    expect(transcript).toContain("### Algorithms");
    expect(transcript).toContain("### Summary");
    expect(transcript).toContain("both hardware (qubits) and algorithms");
  });

  it("falls back to a single pass when deep-mode decomposition doesn't parse", async () => {
    const generate = fakeGenerate(
      "I don't think this needs sub-questions, let me just answer directly.", // decomposition (unparseable)
      "Quantum computing uses qubits instead of classical bits." // single-pass answer
    );

    const { transcript } = await runResearch({
      topic: "quantum computing",
      depth: "deep",
      contextBlock: "",
      generate,
      onSubQuestionStart: () => {},
      onSubQuestionDone: () => {},
    });

    expect(generate).toHaveBeenCalledTimes(2); // decompose attempt + single-pass answer, no synthesis
    expect(transcript).toBe("Quantum computing uses qubits instead of classical bits.");
    expect(transcript).not.toContain("### Summary");
  });

  it("includes the user's clarification in the generated prompts", async () => {
    const generate = fakeGenerate("Focusing on hardware as requested.");

    await runResearch({
      topic: "quantum computing",
      depth: "quick",
      contextBlock: "",
      userClarification: "I care about the hardware side specifically",
      generate,
      onSubQuestionStart: () => {},
      onSubQuestionDone: () => {},
    });

    const [messages] = generate.mock.calls[0];
    const userMessage = messages.find((m: { role: string }) => m.role === "user");
    expect(userMessage.content).toContain("I care about the hardware side specifically");
  });
});
