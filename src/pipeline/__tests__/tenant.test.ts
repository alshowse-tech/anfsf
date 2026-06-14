import { describe, it, expect, beforeEach } from "@jest/globals";
import * as fs from "fs";
import { TenantRegistry, DEFAULT_TENANT_ID } from "../tenant";

describe("TenantRegistry", () => {
  beforeEach(() => { try { fs.rmSync(".anfsf/tenants.json",{force:true}); } catch {} });

  it("provides a default tenant", async () => {
    const r = new TenantRegistry();
    await r.init();
    expect(r.size()).toBe(1);
    expect(r.get(DEFAULT_TENANT_ID)).toBeDefined();
  });

  it("registers and retrieves tenants", async () => {
    const r = new TenantRegistry(); await r.init();
    r.register({id:"t1",name:"Team A",createdAt:Date.now(),enabled:true});
    r.register({id:"t2",name:"Team B",createdAt:Date.now(),enabled:false});
    expect(r.size()).toBe(3);
    expect(r.get("t1")!.name).toBe("Team A");
  });

  it("lists all tenants", async () => {
    const r = new TenantRegistry(); await r.init();
    r.register({id:"t1",name:"Team A",createdAt:Date.now(),enabled:true});
    var list=r.list();
    expect(list.length).toBe(2);
    expect(list.some(t=>t.id==="t1")).toBe(true);
  });

  it("cannot remove default tenant", async () => {
    const r = new TenantRegistry(); await r.init();
    expect(r.remove(DEFAULT_TENANT_ID)).toBe(false);
  });

  it("can remove non-default tenant", async () => {
    const r = new TenantRegistry(); await r.init();
    r.register({id:"removable",name:"Temp",createdAt:Date.now(),enabled:true});
    expect(r.remove("removable")).toBe(true);
    expect(r.get("removable")).toBeUndefined();
  });
});
