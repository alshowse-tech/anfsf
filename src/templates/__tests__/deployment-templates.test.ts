import { describe, it, expect } from "@jest/globals";
import { getDeploymentTemplate, getExtraDependencies } from "../deployment-templates";

describe("DeploymentTemplates", () => {
  it("provides web template", () => {
    const t=getDeploymentTemplate("web");
    expect(t.name).toBe("Web App");
    expect(t.extraDeps.length).toBeGreaterThan(0);
  });

  it("provides h5 template", () => {
    const t=getDeploymentTemplate("h5");
    expect(t.name).toBe("Mobile Web");
  });

  it("provides miniprogram template with static files", () => {
    const t=getDeploymentTemplate("miniprogram");
    expect(t.staticFiles.length).toBeGreaterThan(0);
    expect(t.staticFiles[0].path).toBe("project.config.json");
  });

  it("extra deps returns record", () => {
    const d=getExtraDependencies("web");
    expect(Object.keys(d).length).toBeGreaterThan(0);
  });
});