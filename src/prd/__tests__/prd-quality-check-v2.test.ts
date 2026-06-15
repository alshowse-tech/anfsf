import { describe, it, expect } from "@jest/globals";
import { evaluatePRDQualityV2 } from "../prd-quality-check-v2";

describe("PRDQualityCheckV2", () => {
  it("returns V2 report with structured issues", () => {
    const r=evaluatePRDQualityV2("Build a login page with email and password. Users must be able to register and reset passwords.");
    expect(r.structuredIssues).toBeDefined();
    expect(r.strengths).toBeDefined();
    expect(r.categories).toBeDefined();
  });

  it("detects strengths from good PRD", () => {
    const r=evaluatePRDQualityV2("Users: admin, regular. Features: login, CRUD, search. API: REST. Timing: <500ms response. Test: acceptance criteria defined.");
    expect(r.strengths.length).toBeGreaterThanOrEqual(2);
  });

  it("classifies categories for weak PRD", () => {
    const r=evaluatePRDQualityV2("make it fast and pretty");
    expect(r.categories.length).toBeGreaterThanOrEqual(1);
  });
});
