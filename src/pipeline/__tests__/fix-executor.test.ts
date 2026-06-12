 import * as fs from "fs";
 import * as path from "path";
 import { FixExecutor, type FixExecutionResult } from "../fix-executor";
 import { LLMClient } from "../../integrations/llm-client";
 import type { FixRecord } from "../fix-engine";
 
 const TEST_DIR = path.join(__dirname, "__testdata__", "fix-exec");
 const TEST_FILE = path.join(TEST_DIR, "demo.ts");
 const TEST_RECORD: FixRecord = {
   id: "fix_test_001",
   projectId: "test-proj",
   level: "L1",
   file: "demo.ts",
   line: 3,
   problemType: "type_mismatch",
   issueDescription: "Type 'string' is not assignable to type 'number'",
   fixStatus: "pending",
 };
 
 function mockLLM(content: string): LLMClient {
   const client = new LLMClient({ apiKey: "sk-test" });
   client.chat = async () => ({
     ok: true,
     status: 200,
     content,
     usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
   });
   return client;
 }
 
 function mockFailingLLM(): LLMClient {
   const client = new LLMClient({ apiKey: "sk-test" });
   client.chat = async () => ({
     ok: false,
     status: 500,
     content: "",
     error: "Internal Server Error",
     usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
   });
   return client;
 }
 
 function mockEmptyLLM(): LLMClient {
   const client = new LLMClient({ apiKey: "sk-test" });
   client.chat = async () => ({
     ok: true,
     status: 200,
     content: "  ",
     usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
   });
   return client;
 }
 
 function setupTestDir(): void {
   fs.mkdirSync(TEST_DIR, { recursive: true });
   fs.writeFileSync(TEST_FILE, [
     "function greet(name: string): number {",
     '  return "hello " + name;',
     "}",
   ].join("\n"), "utf-8");
 }
 
 function teardownTestDir(): void {
   try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch { /* ok */ }
 }
 
 beforeEach(() => { setupTestDir(); });
 afterEach(() => { teardownTestDir(); });
 
 // ====================================================================
 // L1 Fix
 // ====================================================================
 
 test("L1 fix applies changes from LLM", async () => {
   const executor = new FixExecutor(mockLLM("function greet(name: string): number {\n  return name.length;\n}"), TEST_DIR);
   const result = await executor.executeL1(TEST_RECORD);
   expect(result.success).toBe(true);
   expect(result.record.fixStatus).toBe("auto_fixed");
   expect(result.modifiedFile).toBe("demo.ts");
   expect(result.patchText.length).toBeGreaterThan(0);
   // Verify file was actually written
   const content = fs.readFileSync(TEST_FILE, "utf-8");
   expect(content).toContain("return name.length");
 });
 
 test("L1 fix records compiled errors to learning DB", async () => {
   // Import after module is loaded
   const { getCompileLearningDB } = await import("../compile-learning-db");
   const executor = new FixExecutor(mockLLM("fixed content"), TEST_DIR);
   await executor.executeL1(TEST_RECORD);
   const db = getCompileLearningDB();
   const patterns = db.getTopPatterns();
   expect(patterns.length).toBeGreaterThanOrEqual(1);
   expect(patterns[0].pattern).not.toBe("");
 });
 
 test("L1 fix returns error when file does not exist", async () => {
   const executor = new FixExecutor(mockLLM("xxx"), TEST_DIR);
   const badRecord = { ...TEST_RECORD, file: "nonexistent.ts" };
   const result = await executor.executeL1(badRecord);
   expect(result.success).toBe(false);
   expect(result.error).toContain("File not found");
 });
 
 test("L1 fix returns error when LLM call fails", async () => {
   const executor = new FixExecutor(mockFailingLLM(), TEST_DIR);
   const result = await executor.executeL1(TEST_RECORD);
   expect(result.success).toBe(false);
   expect(result.error).toContain("LLM fix call failed");
 });
 
 test("L1 fix returns error when LLM returns empty content", async () => {
   const executor = new FixExecutor(mockEmptyLLM(), TEST_DIR);
   const result = await executor.executeL1(TEST_RECORD);
   expect(result.success).toBe(false);
   expect(result.error).toContain("empty");
 });
 
 // ====================================================================
 // L2 Fix
 // ====================================================================
 
 test("L2 fix generates diff without modifying file", async () => {
   const executor = new FixExecutor(mockLLM("@@ -1,3 +1,3 @@\n-fix"), TEST_DIR);
   const l2Record = { ...TEST_RECORD, level: "L2" as const, fixStatus: "pending" as const };
   const result = await executor.executeL2(l2Record);
   expect(result.success).toBe(true);
   expect(result.patchText).toContain("@@");
   // File should not be modified
   const content = fs.readFileSync(TEST_FILE, "utf-8");
   expect(content).toContain("function greet");
 });
 
 test("L2 fix returns error when file does not exist", async () => {
   const executor = new FixExecutor(mockLLM("diff"), TEST_DIR);
   const badRecord = { ...TEST_RECORD, file: "nonexistent.ts", level: "L2" as const };
   const result = await executor.executeL2(badRecord);
   expect(result.success).toBe(false);
   expect(result.error).toContain("File not found");
 });
 
 test("L2 fix returns error when LLM call fails", async () => {
   const executor = new FixExecutor(mockFailingLLM(), TEST_DIR);
   const l2Record = { ...TEST_RECORD, level: "L2" as const, fixStatus: "pending" as const };
   const result = await executor.executeL2(l2Record);
   expect(result.success).toBe(false);
   expect(result.error).toContain("LLM diff call failed");
 });
