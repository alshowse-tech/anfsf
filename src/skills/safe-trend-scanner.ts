/**
 * ANFSF V1.5.0 — Safe Trend Scanner
 *
 * Scans whitelisted sources (GitHub releases, npm registry) for relevant
 * technology trends. Read-only mode — returns suggestions, never auto-adopts.
 */

export interface TrendSource {
  id: string;
  type: 'github-release' | 'npm-package';
  url: string;
}

export interface TrendFinding {
  source: TrendSource;
  title: string;
  summary: string;
  relevanceScore: number; // 0-1
  suggestedAction: 'adopt' | 'evaluate' | 'monitor' | 'ignore';
  rationale: string;
  risks: string[];
}

export interface ScanResult {
  scannedAt: number;
  findings: TrendFinding[];
  sourcesChecked: number;
  sourcesFailed: number;
  duration: number;
}

const WHITELIST_SOURCES: TrendSource[] = [
  { id: 'react', type: 'github-release', url: 'https://api.github.com/repos/facebook/react/releases' },
  { id: 'next.js', type: 'github-release', url: 'https://api.github.com/repos/vercel/next.js/releases' },
  { id: 'vue', type: 'github-release', url: 'https://api.github.com/repos/vuejs/core/releases' },
  { id: 'tailwindcss', type: 'github-release', url: 'https://api.github.com/repos/tailwindlabs/tailwindcss/releases' },
  { id: 'fastify', type: 'github-release', url: 'https://api.github.com/repos/fastify/fastify/releases' },
  { id: 'typescript', type: 'github-release', url: 'https://api.github.com/repos/microsoft/TypeScript/releases' },
];

const SYSTEM_PROMPT = `You are a technology trend analyst. Review the following release notes and summarize which trends are relevant for an AI-native full-stack software factory.

For each release, output a JSON object with:
- title: release title
- summary: 1-2 sentence summary
- relevanceScore: 0-1 how relevant to ANFSF
- suggestedAction: "adopt" | "evaluate" | "monitor" | "ignore"
- rationale: why this matters or doesn't
- risks: array of potential risks or concerns

Rules:
- Be conservative — prefer "monitor" or "evaluate" over "adopt"
- Flag any breaking changes that could affect existing code
- Note security patches as high priority
- Do not recommend untested or major-breaking versions`;

export interface SafeTrendScannerConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  sources?: TrendSource[];
  timeoutMs?: number;
}

export class SafeTrendScanner {
  private apiKey: string;
  private model: string;
  private llmBaseUrl: string;
  private sources: TrendSource[];
  private timeoutMs: number;

  constructor(config: SafeTrendScannerConfig = {}) {
    this.apiKey = config.apiKey || process.env.DASHSCOPE_API_KEY || '';
    this.model = config.model || 'qwen3.5-plus';
    this.llmBaseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.sources = config.sources ?? WHITELIST_SOURCES;
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  /**
   * Scan all whitelisted sources and analyze findings via LLM.
   */
  async scan(): Promise<ScanResult> {
    const start = Date.now();
    const rawResults = await Promise.allSettled(
      this.sources.map(src => this.fetchSource(src))
    );

    const findings: TrendFinding[] = [];
    let sourcesChecked = 0;
    let sourcesFailed = 0;

    for (const result of rawResults) {
      if (result.status === 'fulfilled') {
        sourcesChecked++;
        if (result.value.length > 0) {
          findings.push(...result.value);
        }
      } else {
        sourcesFailed++;
      }
    }

    // Analyze findings with LLM if available
    if (this.apiKey && findings.length > 0) {
      const analyzedFindings = await this.analyzeWithLLM(findings);
      if (analyzedFindings) {
        return {
          scannedAt: Date.now(),
          findings: analyzedFindings,
          sourcesChecked,
          sourcesFailed,
          duration: Date.now() - start,
        };
      }
    }

    return {
      scannedAt: Date.now(),
      findings,
      sourcesChecked,
      sourcesFailed,
      duration: Date.now() - start,
    };
  }

  private async fetchSource(source: TrendSource): Promise<TrendFinding[]> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(source.url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ANFSF-Trend-Scanner/1.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as Array<{
        tag_name: string;
        name: string;
        body: string;
        html_url: string;
        prerelease: boolean;
      }>;

      // Only analyze the latest non-prerelease (up to 2)
      const latest = data
        .filter(r => !r.prerelease)
        .slice(0, 2);

      return latest.map(release => ({
        source,
        title: release.name || release.tag_name,
        summary: release.body?.slice(0, 500) || '',
        relevanceScore: 0,
        suggestedAction: 'monitor' as const,
        rationale: '',
        risks: [],
      }));
    } catch {
      return [];
    }
  }

  private async analyzeWithLLM(findings: TrendFinding[]): Promise<TrendFinding[] | null> {
    if (!this.apiKey) return null;

    const inputText = findings
      .map(f => `### ${f.source.id}: ${f.title}\n${f.summary}`)
      .join('\n\n');

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.llmBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: inputText },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) return null;

      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      const content = data.choices[0]?.message?.content || '';

      try {
        const parsed = JSON.parse(content) as Record<string, Record<string, unknown>>;
        return findings.map((f, i) => {
          const key = Object.keys(parsed)[i];
          const analysis = key ? parsed[key] : {};
          return {
            ...f,
            relevanceScore: typeof analysis.relevanceScore === 'number' ? analysis.relevanceScore : 0,
            suggestedAction: (['adopt', 'evaluate', 'monitor', 'ignore'] as const)
              .includes(analysis.suggestedAction as 'adopt')
              ? analysis.suggestedAction as TrendFinding['suggestedAction']
              : 'monitor',
            rationale: String(analysis.rationale || ''),
            risks: Array.isArray(analysis.risks) ? analysis.risks.map(String) : [],
          };
        });
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }
}

export function createSafeTrendScanner(config: SafeTrendScannerConfig = {}): SafeTrendScanner {
  return new SafeTrendScanner(config);
}
