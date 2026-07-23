import { describe, expect, it } from "vitest";
import { extractSoleToolCall } from "./mcp";

describe("extractSoleToolCall", () => {
  it("extracts a well-formed tool call", () => {
    expect(
      extractSoleToolCall('```tool_call\n{"tool": "ask_question", "args": {"q": "hi"}}\n```')
    ).toEqual({ tool: "ask_question", args: { q: "hi" } });
  });

  it("tolerates prose before the block", () => {
    expect(
      extractSoleToolCall('Let me check that:\n```tool_call\n{"tool": "x", "args": {}}\n```')
    ).toEqual({ tool: "x", args: {} });
  });

  it("tolerates prose after the block", () => {
    expect(
      extractSoleToolCall('```tool_call\n{"tool": "x", "args": {}}\n```\nOne moment.')
    ).toEqual({ tool: "x", args: {} });
  });

  it("returns null for multiple tool_call fences", () => {
    expect(
      extractSoleToolCall(
        '```tool_call\n{"tool": "x", "args": {}}\n```\n\n```tool_call\n{"tool": "y", "args": {}}\n```'
      )
    ).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(extractSoleToolCall("```tool_call\n{not json\n```")).toBeNull();
  });

  it("returns null when the tool field is missing", () => {
    expect(extractSoleToolCall('```tool_call\n{"args": {}}\n```')).toBeNull();
  });

  it("returns null when args is missing or the wrong type", () => {
    expect(extractSoleToolCall('```tool_call\n{"tool": "x", "args": "nope"}\n```')).toBeNull();
    expect(extractSoleToolCall('```tool_call\n{"tool": "x"}\n```')).toBeNull();
  });

  it("returns null for plain text with no fence", () => {
    expect(extractSoleToolCall("The answer is 4.")).toBeNull();
  });

  it("returns null when only a python fence is present", () => {
    expect(extractSoleToolCall("```python\nprint(1)\n```")).toBeNull();
  });

  it("accepts a bare fence with no language tag", () => {
    // Verified live against Llama 3.2 1B: it reliably gets the JSON shape
    // right but just as reliably drops the "tool_call" fence tag.
    expect(extractSoleToolCall('```\n{"tool": "x", "args": {}}\n```')).toEqual({
      tool: "x",
      args: {},
    });
  });

  it("accepts a json-tagged fence", () => {
    expect(extractSoleToolCall('```json\n{"tool": "x", "args": {}}\n```')).toEqual({
      tool: "x",
      args: {},
    });
  });
});
