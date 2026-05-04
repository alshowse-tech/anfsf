/**
 * ANFSF V1.5.0 — Detail Polisher
 *
 * LLM-driven code polishing across 4 dimensions:
 * experience (a11y, states), performance (allocations, patterns),
 * edge-cases (null checks, boundaries), code-aesthetics (dead code, naming).
 */

export interface PolishCategory {
  dimension: 'experience' | 'performance' | 'edge-cases' | 'code-aesthetics';
  enabled: boolean;
}

export interface PolishFinding {
  dimension: PolishCategory['dimension'];
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  originalSnippet?: string;
  suggestedFix?: string;
  lineHint?: number;
}

export interface FilePolishResult {
  path: string;
  modified: boolean;
  code: string;
  originalCode: string;
  findings: PolishFinding[];
  duration: number;
}

export interface DetailPolisherConfig {
  apiKey: string;
  model?: string;
  categories?: PolishCategory[];
  timeoutMs?: number;
}

const DEFAULT_CATEGORIES: PolishCategory[] = [
  { dimension: 'experience', enabled: true },
  { dimension: 'performance', enabled: true },
  { dimension: 'edge-cases', enabled: true },
  { dimension: 'code-aesthetics', enabled: true },
];

const SYSTEM_PROMPTS: Record<PolishCategory['dimension'], string> = {
  experience: `You are a code reviewer focused on user experience quality. Review the code and identify:
1. Missing a11y attributes (aria-label, role, alt text, tabIndex)
2. Missing or poor error messages
3. Missing empty states for lists/tables/forms
4. Missing loading states

Output JSON only with this exact structure:
{"findings":[{"description":"issue","severity":"critical|major|minor|cosmetic","originalSnippet":"exact code to replace","suggestedFix":"replacement code","lineHint":lineNumberOrNull}],"fixes":[{"originalText":"exact code snippet to find","fixedText":"replacement"}]}`,

  performance: `You are a code reviewer focused on performance. Review the code and identify:
1. Unnecessary object/array allocations in loops
2. Inefficient patterns (O(n^2) where O(n) possible, redundant computations)
3. Missing memoization (React useMemo/useCallback or equivalent)
4. Large bundle imports that could be tree-shaken

Output JSON only with this exact structure:
{"findings":[{"description":"issue","severity":"critical|major|minor|cosmetic","originalSnippet":"exact code to replace","suggestedFix":"replacement code","lineHint":lineNumberOrNull}],"fixes":[{"originalText":"exact code snippet to find","fixedText":"replacement"}]}`,

  'edge-cases': `You are a code reviewer focused on robustness. Review the code and identify:
1. Missing null/undefined checks on parameters and return values
2. Missing boundary condition handling (empty arrays, zero, negative numbers)
3. Unhandled promise rejections or missing catch blocks
4. Missing input validation for external data

Output JSON only with this exact structure:
{"findings":[{"description":"issue","severity":"critical|major|minor|cosmetic","originalSnippet":"exact code to replace","suggestedFix":"replacement code","lineHint":lineNumberOrNull}],"fixes":[{"originalText":"exact code snippet to find","fixedText":"replacement"}]}`,

  'code-aesthetics': `You are a code reviewer focused on code quality. Review the code and identify:
1. Inconsistent naming (camelCase vs snakeCase, abbreviations)
2. Dead code (unused imports, unreachable branches, commented-out code)
3. Overly complex conditionals that can be simplified
4. Magic numbers/strings that should be constants

Output JSON only with this exact structure:
{"findings":[{"description":"issue","severity":"critical|major|minor|cosmetic","originalSnippet":"exact code to replace","suggestedFix":"replacement code","lineHint":lineNumberOrNull}],"fixes":[{"originalText":"exact code snippet to find","fixedText":"replacement"}]}`,
};

export class DetailPolisher {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private categories: PolishCategory[];
  private timeoutMs: number;

  constructor(config: DetailPolisherConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'qwen3.5-plus';
    this.baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.categories = config.categories ?? DEFAULT_CATEGORIES;
    this.timeoutMs = config.timeoutMs ?? 30000;
  }

  /**
   * Polish all files through all enabled categories.
   * Files are processed in parallel; categories run sequentially per file.
   */
  async polish(
    files: Array<{ path: string; content: string }>,
    prdContext?: string
  ): Promise<FilePolishResult[]> {
    return Promise.all(files.map(f => this.polishFile(f, prdContext)));
  }

  private async polishFile(
    file: { path: string; content: string },
    prdContext?: string
  ): Promise<FilePolishResult> {
    const start = Date.now();
    let code = file.content;
    const allFindings: PolishFinding[] = [];

    for (const cat of this.categories) {
      if (!cat.enabled) continue;
      if (Date.now() - start > this.timeoutMs) break;

      const result = await this.polishCategory(code, file.path, cat.dimension, prdContext);
      code = result.code;
      allFindings.push(...result.findings);
    }

    return {
      path: file.path,
      modified: code !== file.content,
      code,
      originalCode: file.content,
      findings: allFindings,
      duration: Date.now() - start,
    };
  }

  private async polishCategory(
    code: string,
    filePath: string,
    dimension: PolishCategory['dimension'],
    _prdContext?: string
  ): Promise<{ code: string; findings: PolishFinding[] }> {
    if (!this.apiKey) {
      return { code, findings: [] };
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPTS[dimension] },
            { role: 'user', content: `File: ${filePath}\n\n${code}` },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) return { code, findings: [] };

      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      const content = data.choices[0]?.message?.content || '';

      try {
        const parsed = JSON.parse(content) as {
          findings?: Array<Record<string, unknown>>;
          fixes?: Array<{ originalText: string; fixedText: string }>;
        };

        const findings: PolishFinding[] = (parsed.findings || []).map(f => ({
          dimension,
          description: String(f.description || ''),
          severity: (f.severity as PolishFinding['severity']) || 'cosmetic',
          originalSnippet: f.originalSnippet ? String(f.originalSnippet) : undefined,
          suggestedFix: f.suggestedFix ? String(f.suggestedFix) : undefined,
          lineHint: typeof f.lineHint === 'number' ? f.lineHint : undefined,
        }));

        const polishedCode = this.applyFixes(code, parsed.fixes || []);
        return { code: polishedCode, findings };
      } catch {
        return { code, findings: [] };
      }
    } catch {
      return { code, findings: [] };
    }
  }

  private applyFixes(code: string, fixes: Array<{ originalText: string; fixedText: string }>): string {
    let result = code;
    for (const fix of fixes) {
      if (!fix.originalText || !fix.fixedText) continue;
      const idx = result.indexOf(fix.originalText);
      if (idx !== -1) {
        result = result.slice(0, idx) + fix.fixedText + result.slice(idx + fix.originalText.length);
      }
    }
    return result;
  }
}

export function createDetailPolisher(config: DetailPolisherConfig): DetailPolisher {
  return new DetailPolisher(config);
}
