/**
 * ANFSF Templates ? Deployment-Specific Templates (GAP-13)
 *
 * Provides format-specific dependencies, file structures,
 * and configurations for web, H5, and miniprogram output.
 */

export type DeploymentForm = "web" | "h5" | "miniprogram";

export interface DeploymentTemplate {
  name: string;
  framework: string;
  extraDeps: string[];
  extraDevDeps: string[];
  staticFiles: Array<{ path: string; content: string }>;
  buildScript: string;
}

function miniprogramStatic(): DeploymentTemplate["staticFiles"] {
  return [
    { path: "project.config.json", content: JSON.stringify({ setting: { packNpmManually: true }, appid: "touristappid" }, null, 2) },
    { path: "app.json", content: JSON.stringify({ pages: ["pages/index/index"], window: { navigationBarTitleText: "App" } }, null, 2) },
  ];
}

const TEMPLATES: Record<DeploymentForm, DeploymentTemplate> = {
  web: {
    name: "Web App", framework: "react",
    extraDeps: ["react-router-dom","axios"],
    extraDevDeps: ["@types/react-router-dom"],
    staticFiles: [],
    buildScript: "vite build",
  },
  h5: {
    name: "Mobile Web", framework: "react",
    extraDeps: ["react-router-dom","axios","viewport-units-buggyfill"],
    extraDevDeps: ["postcss-mobile-forever"],
    staticFiles: [],
    buildScript: "vite build",
  },
  miniprogram: {
    name: "Mini Program", framework: "miniprogram",
    extraDeps: [],
    extraDevDeps: [],
    staticFiles: miniprogramStatic(),
    buildScript: "miniprogram-ci preview",
  },
};

export function getDeploymentTemplate(form: DeploymentForm): DeploymentTemplate {
  return TEMPLATES[form];
}

export function getExtraDependencies(form: DeploymentForm): Record<string, string> {
  const tpl=getDeploymentTemplate(form);
  const deps:Record<string,string>={};
  tpl.extraDeps.forEach(function(d){deps[d]="latest";});
  return deps;
}