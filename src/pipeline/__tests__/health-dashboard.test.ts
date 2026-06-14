import { describe, it, expect } from "@jest/globals";
import { HealthDashboard } from "../health-dashboard";
import { getProjectRegistry, resetProjectRegistry } from "../project";

describe("HealthDashboard", () => {
  beforeEach(() => { resetProjectRegistry(); });

  it("returns dashboard data with defaults", () => {
    var d=new HealthDashboard();
    var data=d.getData();
    expect(data.projects).toBeDefined();
    expect(data.tenants).toBeDefined();
    expect(data.pipeline).toBeDefined();
    expect(data.timestamp).toBeGreaterThan(0);
  });

  it("counts projects by state", () => {
    var reg=getProjectRegistry();
    reg.create("P1","prd");
    reg.create("P2","prd");
    var d=new HealthDashboard();
    var data=d.getData();
    expect(data.projects.total).toBe(2);
    expect(data.projects.byState["created"]).toBe(2);
  });

  it("return project summary", () => {
    var d=new HealthDashboard();
    var list=d.getProjectSummary();
    expect(Array.isArray(list)).toBe(true);
  });
});