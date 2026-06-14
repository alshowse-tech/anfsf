import * as fs from "fs";
import * as path from "path";
import { ComponentMiner, getComponentMiner } from "../component-miner";

const TEST_DIR = path.join(__dirname, "__testdata__", "comp-miner");
const TEST_DB = path.join(TEST_DIR, "patterns.json");

const SAMPLE_TSX = [
  "import React, { useState, useEffect } from 'react';",
  "import { useNavigate } from 'react-router-dom';",
  "",
  "interface UserProfileProps {",
  "  userId: string;",
  "  name: string;",
  "  avatar?: string;",
  "}",
  "",
  "export const UserProfile: React.FC<UserProfileProps> = ({ userId, name, avatar }) => {",
  "  const [loading, setLoading] = useState(true);",
  "  const navigate = useNavigate();",
  "",
  "  useEffect(() => {",
  "    fetch('/api/users/' + userId).then(r => r.json()).then(d => { setLoading(false); });",
  "  }, [userId]);",
  "",
  "  if (loading) return <div>Loading...</div>;",
  "  return <div className='profile'><h2>{name}</h2></div>;",
  "};",
].join("\n");

function setup(): void {
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.writeFileSync(path.join(TEST_DIR, "UserProfile.tsx"), SAMPLE_TSX, "utf-8");
}

function teardown(): void {
  try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch {}
}

beforeEach(() => setup());
afterEach(() => teardown());

describe("ComponentMiner", () => {
  it("extracts component from TSX file", () => {
    const miner = new ComponentMiner(TEST_DB);
    const results = miner.scan(TEST_DIR, "web", ["UserProfile.tsx"]);
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("UserProfile");
    expect(results[0].hooks).toContain("useState");
    expect(results[0].hooks).toContain("useEffect");
    expect(results[0].dependencies).toContain("react-router-dom");
  });

  it("deduplicates on re-scan", () => {
    const miner = new ComponentMiner(TEST_DB);
    miner.scan(TEST_DIR, "web", ["UserProfile.tsx"]);
    miner.scan(TEST_DIR, "web", ["UserProfile.tsx"]);
    const results = miner.query("web", 10);
    const item = results.find(r => r.name === "UserProfile");
    expect(item).toBeDefined();
    expect(item!.occurrenceCount).toBe(2);
  });

  it("getPromptInjection returns formatted block", () => {
    const miner = new ComponentMiner(TEST_DB);
    miner.scan(TEST_DIR, "web", ["UserProfile.tsx"]);
    const inj = miner.getPromptInjection("web");
    expect(inj).toContain("UserProfile");
    expect(inj).toContain("useState");
  });

  it("returns empty injection when no patterns", () => {
    const miner = new ComponentMiner(path.join(TEST_DIR, "empty.json"));
    expect(miner.getPromptInjection("web")).toBe("");
  });

  it("persists and reloads", () => {
    const m1 = new ComponentMiner(TEST_DB);
    m1.scan(TEST_DIR, "web", ["UserProfile.tsx"]);
    m1.flush();
    expect(m1.totalPatterns).toBe(1);
    const m2 = new ComponentMiner(TEST_DB);
    expect(m2.totalPatterns).toBe(1);
    m2.dispose();
  });
});
