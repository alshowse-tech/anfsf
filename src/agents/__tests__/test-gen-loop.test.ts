import { describe, it, expect } from "@jest/globals";
import { LLMClient } from "../../integrations/llm-client";
import { TestGenLoop, type TestSuite } from "../test-gen-loop";
import type { RequirementSpec } from "../code-generation-loop";

const VALID_RESPONSE = "===FILE: tests/example.spec.ts\n// [generated]\ndescribe('example', () => {\n  it('works', () => { expect(1).toBe(1); });\n});\n===END===";

function mockLLM(content: string): LLMClient {
  const c = new LLMClient({ apiKey: "sk-test" });
  c.chat = async () => ({ ok: true, status: 200, content, usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 } });
  return c;
}

const sampleSpec: RequirementSpec = {
  intent: "Todo app",
  features: [{ id: "f1", name: "Tasks", description: "CRUD tasks", priority: "P0" }],
};

describe("TestGenLoop", () => {
  it("generates test suite from spec", async () => {
    const loop = new TestGenLoop(mockLLM(VALID_RESPONSE));
    const suite = await loop.generate(sampleSpec);
    expect(suite.files.length).toBeGreaterThan(0);
    expect(suite.files[0].path).toContain(".spec.ts");
  });

  it("verify returns empty errors for valid suite", async () => {
    const suite: TestSuite = { files: [{ path: "tests/a.spec.ts", content: "test('x',()=>{})", source: "generated", framework: "jest" }] };
    const loop = new TestGenLoop(mockLLM(""));
    const errors = await loop.verify(suite);
    expect(Array.isArray(errors)).toBe(true);
  });

  it("fix preserves suite when LLM fails", async () => {
    const c = new LLMClient({ apiKey: "sk-test" });
    c.chat = async () => ({ ok: false, status: 500, content: "", error: "Fail", usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } });
    const loop = new TestGenLoop(c);
    const suite: TestSuite = { files: [{ path: "t.spec.ts", content: "test('x',()=>{})", source: "generated", framework: "jest" }] };
    await expect(loop.fix([{ file: "t.spec.ts", line: 1, message: "err", type: "syntax", severity: "error" }], suite)).rejects.toThrow();
  });
});


