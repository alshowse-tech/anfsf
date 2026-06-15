/**
 * ANFSF Pipeline — Knowledge Bridge (GAP-12)
 * Bridges CompileLearningDB + ComponentMiner into KnowledgeBase.
 */
import { getCompileLearningDB } from "./compile-learning-db";
import { getComponentMiner } from "./component-miner";
import { KnowledgeBase, type KnowledgeEntry } from "../storage/knowledge-base";
import type { IntrospectionReport } from "../core/evolution/introspection-engine";

const KB_PATH = ".anfsf/knowledge-base.json";
const CAT_COMPILE = "compile-pattern";
const CAT_COMPONENT = "component-pattern";
const CAT_INTROSPECTION = "introspection";

let _kb: KnowledgeBase | null = null;
function getKB(): KnowledgeBase {
  if (!_kb) { _kb = new KnowledgeBase(KB_PATH); _kb.init().catch(() => {}); }
  return _kb;
}

export async function syncToKnowledgeBase(projectId: string): Promise<number> {
  const kb = getKB(); let count = 0; const ts = Date.now();
  const db = getCompileLearningDB();
  const patterns = db.getTopPatterns(undefined, { minFrequency: 1, limit: 50 });
  for (const p of patterns) {
    const id = "n_" + Math.random().toString(36).slice(2, 10) + "_" + ts;
    await kb.add({ id, projectId, category: CAT_COMPILE, content: JSON.stringify(p), createdAt: ts });
    count++;
  }
  const miner = getComponentMiner();
  const components = miner.query(undefined, 20);
  for (const c of components) {
    const id = "n_" + Math.random().toString(36).slice(2, 10) + "_" + ts;
    await kb.add({ id, projectId, category: CAT_COMPONENT, content: JSON.stringify(c), createdAt: ts });
    count++;
  }
  return count;
}

export async function syncIntrospectionFindings(
  report: IntrospectionReport,
  projectId: string,
): Promise<number> {
  if (report.findings.length === 0) return 0;
  const kb = getKB();
  const ts = Date.now();
  let count = 0;

  // Store each finding as an individual knowledge entry
  for (const finding of report.findings) {
    const id = "intr_" + Math.random().toString(36).slice(2, 10) + "_" + ts;
    await kb.add({
      id,
      projectId,
      category: CAT_INTROSPECTION,
      content: JSON.stringify(finding),
      metadata: { summary: report.summary, severity: finding.severity, effort: finding.effort },
      createdAt: ts,
    });
    count++;
  }
  return count;
}

export async function getKnowledgeInjection(projectType?: string, limit = 5): Promise<string> {
  const kb = getKB();
  const items: KnowledgeEntry[] = [];
  items.push(...(await kb.query(undefined, CAT_COMPILE)));
  items.push(...(await kb.query(undefined, CAT_COMPONENT)));
  if (items.length === 0) return '';
  items.sort((a, b) => b.createdAt - a.createdAt);
  const selected = items.slice(0, Math.min(limit, items.length));
  const lines: string[] = ['', 'Knowledge from past projects:', ''];
  for (const item of selected) {
    const preview = item.content.slice(0, 120).replace(/\n/g, " ");
    lines.push("- [" + item.category + "] " + preview);
  }
  lines.push('');
  return lines.join("\n");
}



export function resetKnowledgeBase(): void {
  _kb = null;
}
