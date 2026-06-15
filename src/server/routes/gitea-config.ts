import { FastifyInstance } from "fastify";
import * as fs from "fs";

const CONFIG_PATH = ".anfsf/gitea-config.json";

interface GiteaConfigData {
  url: string; token: string; owner: string;
}

function loadConfig(): GiteaConfigData {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }
  } catch { /* ignore */ }
  return { url: process.env.GITEA_URL || "http://localhost:3001", token: "", owner: "" };
}

function saveConfig(config: GiteaConfigData): void {
  const dir = require("path").dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function registerGiteaConfigRoutes(app: FastifyInstance): void {
  app.get("/api/v1/config/gitea", async () => {
    return { status: "ok", config: loadConfig() };
  });

  app.put("/api/v1/config/gitea", async (req) => {
    const body = req.body as Record<string, unknown>;
    const current = loadConfig();
    const config: GiteaConfigData = {
      url: typeof body.url === "string" ? body.url : current.url,
      token: typeof body.token === "string" ? body.token : current.token,
      owner: typeof body.owner === "string" ? body.owner : current.owner,
    };
    saveConfig(config);
    return { status: "ok", config };
  });
}