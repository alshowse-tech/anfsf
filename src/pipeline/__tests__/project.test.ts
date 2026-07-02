import { describe, it, expect, beforeEach } from "@jest/globals";
import { ProjectRegistry, getProjectRegistry, resetProjectRegistry } from "../project";
import * as fs from 'fs';
import * as path from 'path';

const TEST_STORAGE = path.resolve('.anfsf/projects.json');

describe("ProjectRegistry", () => {
  beforeEach(() => {
    resetProjectRegistry();
    // Clean persisted state between tests
    try { fs.unlinkSync(TEST_STORAGE); } catch {}
  });

  it("creates and retrieves a project", () => {
    var reg=getProjectRegistry();
    var p=reg.create("Todo App","Build a todo app");
    expect(p.name).toBe("Todo App");
    expect(p.prdText).toBe("Build a todo app");
    expect(p.projectState).toBe("created");
    expect(p.tenantId).toBe("default");
    var got=reg.get(p.id);
    expect(got).toBeDefined();
    expect(got!.name).toBe("Todo App");
  });

  it("lists projects", () => {
    var reg=getProjectRegistry();
    reg.create("P1","prd1");
    reg.create("P2","prd2");
    expect(reg.size()).toBe(2);
    expect(reg.list().length).toBe(2);
  });

  it("filters by tenantId", () => {
    var reg=getProjectRegistry();
    reg.create("T1P1","prd","tenant-a");
    reg.create("T1P2","prd","tenant-a");
    reg.create("T2P1","prd","tenant-b");
    expect(reg.list("tenant-a").length).toBe(2);
    expect(reg.list("tenant-b").length).toBe(1);
  });

  it("updates project state", () => {
    var reg=getProjectRegistry();
    var p=reg.create("Test","prd");
    expect(reg.updateState(p.id,"stage1_parsing")).toBe(true);
    expect(reg.get(p.id)!.projectState).toBe("stage1_parsing");
  });

  it("removes a project", () => {
    var reg=getProjectRegistry();
    var p=reg.create("Temp","prd");
    expect(reg.remove(p.id)).toBe(true);
    expect(reg.get(p.id)).toBeUndefined();
    expect(reg.remove("nonexistent")).toBe(false);
  });
});
