 import { CompileLearningDB, verificationErrorsToNormalized } from '../compile-learning-db';
 import * as fs from 'fs';
 import * as path from 'path';
 
 const TEST_DB_PATH = path.join(__dirname, '__testdata__', 'compile-learning-test.json');
 
 let activeDBs: CompileLearningDB[] = [];
 
 function cleanTestDB(): void {
   try { fs.rmSync(path.dirname(TEST_DB_PATH), { recursive: true, force: true }); } catch { /* ok */ }
 }
 
 beforeEach(() => { cleanTestDB(); activeDBs = []; });
 afterEach(() => { for (const db of activeDBs) db.dispose(); });
 afterAll(() => { cleanTestDB(); });
 
 function makeDB(path?: string): CompileLearningDB {
   const db = new CompileLearningDB(path ?? TEST_DB_PATH);
   activeDBs.push(db);
   return db;
 }
 
 // ====================================================================
 // Basic recording and querying
 // ====================================================================
 
 test('records a single error and can query it', () => {
   const db = makeDB();
   db.recordErrors([
     { pattern: "TS2322: Type X is not assignable to type Y", raw: "Type 'string' is not assignable to type 'number'", fileExt: ".ts", projectType: "web", fixHint: "Adjust type signature", resolvedAtRound: 1, outcome: "fixed" },
   ]);
   const patterns = db.getTopPatterns();
   expect(patterns).toHaveLength(1);
   expect(patterns[0].pattern).toBe("TS2322: Type X is not assignable to type Y");
   expect(patterns[0].frequency).toBe(1);
 });
 
 test('returns empty for no records', () => {
   const db = makeDB();
   expect(db.getTopPatterns()).toHaveLength(0);
   expect(db.totalRecords).toBe(0);
   expect(db.uniquePatterns).toBe(0);
 });
 
 test('filters by project type', () => {
   const db = makeDB();
   db.recordErrors([
     { pattern: "TS2322: type", raw: "web error", fileExt: ".ts", projectType: "web", fixHint: "fix", resolvedAtRound: 1, outcome: "fixed" },
     { pattern: "TS2322: type", raw: "mobile error", fileExt: ".ts", projectType: "mobile", fixHint: "fix", resolvedAtRound: 1, outcome: "fixed" },
     { pattern: "TS2304: name", raw: "web name error", fileExt: ".ts", projectType: "web", fixHint: "fix", resolvedAtRound: 0, outcome: "fixed" },
   ]);
   expect(db.getTopPatterns("web")).toHaveLength(2);
   expect(db.getTopPatterns("mobile")).toHaveLength(1);
 });
 
 test('applies minFrequency threshold', () => {
   const db = makeDB();
   db.recordErrors([
     { pattern: "RARE: something", raw: "rare", fileExt: ".ts", projectType: "web", fixHint: "x", resolvedAtRound: 0, outcome: "fixed" },
     { pattern: "COMMON: something", raw: "common1", fileExt: ".ts", projectType: "web", fixHint: "y", resolvedAtRound: 0, outcome: "fixed" },
     { pattern: "COMMON: something", raw: "common2", fileExt: ".ts", projectType: "web", fixHint: "y", resolvedAtRound: 1, outcome: "fixed" },
   ]);
   const withThreshold = db.getTopPatterns(undefined, { minFrequency: 2, limit: 10 });
   expect(withThreshold).toHaveLength(1);
   expect(withThreshold[0].pattern).toBe("COMMON: something");
 });
 
 // ====================================================================
 // Normalization
 // ====================================================================
 
 test('verificationErrorsToNormalized produces normalized patterns', () => {
   const errors = verificationErrorsToNormalized(
     [
       { message: "Type 'string[]' is not assignable to type 'number[]'", file: "src/index.ts", rule: "tsc" },
       { message: "Cannot find module './models/User'", file: "src/routes/user.ts" },
     ],
     "web",
     1,
     "fixed",
   );
   expect(errors).toHaveLength(2);
   expect(errors[0].pattern).toContain("Type X is not assignable to type");
   expect(errors[1].pattern).toContain("Cannot find module");
   expect(errors[1].projectType).toBe("web");
   expect(errors[1].outcome).toBe("fixed");
 });
 
 test('normalization collapses paths and quoted strings', () => {
   const errors = verificationErrorsToNormalized(
     [
       { message: "Cannot find module 'express' or its corresponding type declarations", file: "src/app.ts" },
       { message: "Cannot find module 'lodash' or its corresponding type declarations", file: "src/utils.ts" },
     ],
     "web", 0, "fixed",
   );
   expect(errors[0].pattern).toBe(errors[1].pattern);
 });
 
 // ====================================================================
 // Prompt injection
 // ====================================================================
 
 test('getPromptInjection returns empty string when no data', () => {
   const db = new CompileLearningDB(TEST_DB_PATH);
   expect(db.getPromptInjection()).toBe("");
 });
 
 test('getPromptInjection returns formatted block with patterns', () => {
   const db = makeDB();
   db.recordErrors([
     { pattern: "TS2322: Type X not assignable", raw: "err1", fileExt: ".ts", projectType: "web", fixHint: "Adjust type", resolvedAtRound: 1, outcome: "fixed" },
     { pattern: "TS2322: Type X not assignable", raw: "err2", fileExt: ".ts", projectType: "web", fixHint: "Adjust type", resolvedAtRound: 0, outcome: "fixed" },
     // Need >= 2 occurrences to pass minFrequency threshold of 2
     { pattern: "TS2304: Cannot find name X", raw: "err3", fileExt: ".ts", projectType: "web", fixHint: "Check import", resolvedAtRound: 2, outcome: "fixed" },
     { pattern: "TS2304: Cannot find name X", raw: "err4", fileExt: ".ts", projectType: "web", fixHint: "Check import", resolvedAtRound: 1, outcome: "fixed" },
   ]);
   const injection = db.getPromptInjection("web");
   expect(injection).toContain("Learn from past compilation errors");
   expect(injection).toContain("TS2322");
   expect(injection).toContain("TS2304");
   expect(injection).toContain("Adjust type");
   expect(injection).toContain("Check import");
 });
 
 test('getPromptInjection respects limit', () => {
   const db = makeDB();
   db.recordErrors([
     { pattern: "ERR_A", raw: "a1", fileExt: ".ts", projectType: "web", fixHint: "x", resolvedAtRound: 0, outcome: "fixed" },
     { pattern: "ERR_A", raw: "a2", fileExt: ".ts", projectType: "web", fixHint: "x", resolvedAtRound: 0, outcome: "fixed" },
     { pattern: "ERR_B", raw: "b1", fileExt: ".ts", projectType: "web", fixHint: "y", resolvedAtRound: 0, outcome: "fixed" },
     { pattern: "ERR_B", raw: "b2", fileExt: ".ts", projectType: "web", fixHint: "y", resolvedAtRound: 0, outcome: "fixed" },
     { pattern: "ERR_C", raw: "c1", fileExt: ".ts", projectType: "web", fixHint: "z", resolvedAtRound: 0, outcome: "fixed" },
     { pattern: "ERR_C", raw: "c2", fileExt: ".ts", projectType: "web", fixHint: "z", resolvedAtRound: 0, outcome: "fixed" },
   ]);
   const injections = db.getPromptInjection("web", 2);
   const patternLines = injections.split("\n").filter(l => l.startsWith("- "));
   expect(patternLines).toHaveLength(2);
 });
 
 // ====================================================================
 // Persistence
 // ====================================================================
 
 test('persists data to disk and reloads', () => {
   const db1 = makeDB();
   db1.recordErrors([
     { pattern: "TS2322: type", raw: "err", fileExt: ".ts", projectType: "web", fixHint: "fix", resolvedAtRound: 1, outcome: "fixed" },
   ]);
   db1.flush();
   expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
 
   const db2 = new CompileLearningDB(TEST_DB_PATH);
   expect(db2.totalRecords).toBe(1);
   expect(db2.getTopPatterns()).toHaveLength(1);
 });
 
 test('handles missing file gracefully', () => {
   const db = makeDB(path.join(__dirname, '__nonexistent__', 'data.json'));
   expect(db.totalRecords).toBe(0);
   expect(db.getPromptInjection()).toBe("");
 });
 
 // ====================================================================
 // Pruning
 // ====================================================================
 
 test('pruneOlderThan removes old records', () => {
   const db = makeDB();
   db.recordErrors([
     { pattern: "OLD", raw: "old err", fileExt: ".ts", projectType: "web", fixHint: "x", resolvedAtRound: 0, outcome: "fixed" },
   ]);
   // Manually age the record
   (db as any).records[0].timestamp = Date.now() - 100 * 24 * 60 * 60 * 1000; // 100 days ago
   db.recordErrors([
     { pattern: "NEW", raw: "new err", fileExt: ".ts", projectType: "web", fixHint: "y", resolvedAtRound: 0, outcome: "fixed" },
   ]);
   const pruned = db.pruneOlderThan(30);
   expect(pruned).toBe(1);
   expect(db.totalRecords).toBe(1);
   expect(db.getTopPatterns()[0].pattern).toBe("NEW");
 });
 
 // ====================================================================
 // Summary
 // ====================================================================
 
 test('getSummary returns markdown table', () => {
   const db = makeDB();
   expect(db.getSummary()).toBe("No compilation data recorded yet.");
 
   db.recordErrors([
     { pattern: "TS2322: type", raw: "err", fileExt: ".ts", projectType: "web", fixHint: "Adjust type", resolvedAtRound: 1, outcome: "fixed" },
   ]);
   const summary = db.getSummary();
   expect(summary).toContain("Compile Learning Summary");
   expect(summary).toContain("TS2322");
   expect(summary).toContain("Adjust type");
 });
 
 // ====================================================================
 // avgFixRound computation
 // ====================================================================
 
 test('avgFixRound is correct for mixed outcomes', () => {
   const db = makeDB();
   db.recordErrors([
     { pattern: "ERR", raw: "e1", fileExt: ".ts", projectType: "web", fixHint: "x", resolvedAtRound: 1, outcome: "fixed" },
     { pattern: "ERR", raw: "e2", fileExt: ".ts", projectType: "web", fixHint: "x", resolvedAtRound: 2, outcome: "fixed" },
     { pattern: "ERR", raw: "e3", fileExt: ".ts", projectType: "web", fixHint: "x", resolvedAtRound: 0, outcome: "abandoned" },
   ]);
   const patterns = db.getTopPatterns();
   // avgFixRound should ignore abandoned; (1 + 2) / 2 = 1.5
   expect(patterns[0].avgFixRound).toBeCloseTo(1.5, 1);
 });
 
 test('uniquePatterns counts distinct patterns', () => {
   const db = makeDB();
   db.recordErrors([
     { pattern: "ERR_A", raw: "a1", fileExt: ".ts", projectType: "web", fixHint: "x", resolvedAtRound: 0, outcome: "fixed" },
     { pattern: "ERR_A", raw: "a2", fileExt: ".ts", projectType: "web", fixHint: "x", resolvedAtRound: 0, outcome: "fixed" },
     { pattern: "ERR_B", raw: "b1", fileExt: ".ts", projectType: "web", fixHint: "y", resolvedAtRound: 0, outcome: "fixed" },
   ]);
   expect(db.uniquePatterns).toBe(2);
 });
