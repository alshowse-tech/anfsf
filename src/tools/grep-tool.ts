/**
 * ANFSF — Grep Tool
 *
 * Searches file contents using regex patterns. Readonly — does not modify state.
 * Supports file-type filtering via glob patterns.
 *
 * Phase 2: Tool System Infrastructure
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Tool, ToolDefinition, ToolResult, ToolContext } from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_RESULTS = 250;
const MAX_FILE_SIZE_BYTES = 1_000_000; // 1MB — skip larger files

// ============================================================================
// GrepTool
// ============================================================================

const GREP_TOOL_DEFINITION: ToolDefinition = {
  name: 'search_code',
  description:
    'Search file contents using a regex pattern. Returns matching lines ' +
    'with file paths and line numbers. Supports glob filtering for file types. ' +
    'Use this to find references, definitions, or patterns across the codebase.',
  parameters: [
    {
      name: 'pattern',
      type: 'string',
      description: 'The regex pattern to search for (e.g. "function\\s+\\w+")',
      required: true,
    },
    {
      name: 'path',
      type: 'string',
      description: 'Directory or file to search in (default: working directory)',
      required: false,
    },
    {
      name: 'glob',
      type: 'string',
      description: 'File pattern filter, e.g. "*.ts" or "*.{ts,tsx}" (default: all text files)',
      required: false,
    },
    {
      name: 'max_results',
      type: 'number',
      description: 'Maximum number of results to return (default: 250)',
      required: false,
    },
  ],
  mode: 'readonly',
  requiresSandbox: false,
};

/** Extensions considered "text" for searching */
const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt',
  '.css', '.scss', '.html', '.xml', '.yaml', '.yml',
  '.env', '.gitignore', '.dockerignore', '.sh', '.bash',
  '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h',
  '.sql', '.graphql', '.prisma', '.toml', '.ini',
]);

export class GrepTool implements Tool {
  readonly definition: ToolDefinition = GREP_TOOL_DEFINITION;

  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const pattern = String(params.pattern ?? '');
    const searchPath = String(params.path ?? context.workingDir);
    const globPattern = params.glob ? String(params.glob) : undefined;
    const maxResults = Math.min(
      Number(params.max_results ?? DEFAULT_MAX_RESULTS),
      1000,
    );

    if (!pattern) {
      return {
        callId: '',
        toolName: 'search_code',
        success: false,
        output: '',
        error: 'Pattern must not be empty',
        durationMs: 0,
      };
    }

    const resolved = path.isAbsolute(searchPath)
      ? searchPath
      : path.resolve(context.workingDir, searchPath);

    if (!fs.existsSync(resolved)) {
      return {
        callId: '',
        toolName: 'search_code',
        success: false,
        output: '',
        error: `Path not found: ${searchPath}`,
        durationMs: 0,
      };
    }

    const start = Date.now();
    const results: Array<{ file: string; line: number; content: string }> = [];

    try {
      let regex: RegExp;
      try {
        regex = new RegExp(pattern, 'g');
      } catch {
        return {
          callId: '',
          toolName: 'search_code',
          success: false,
          output: '',
          error: `Invalid regex pattern: ${pattern}`,
          durationMs: 0,
        };
      }

      const stat = fs.statSync(resolved);
      if (stat.isFile()) {
        // Search a single file
        this.searchFile(resolved, regex, resolved, results, maxResults);
      } else if (stat.isDirectory()) {
        // Walk directory
        this.walkDir(resolved, regex, resolved, globPattern, results, maxResults);
      }

      // Format output
      if (results.length === 0) {
        return {
          callId: '',
          toolName: 'search_code',
          success: true,
          output: `No matches found for pattern: ${pattern}`,
          durationMs: Date.now() - start,
        };
      }

      const truncated = results.length >= maxResults
        ? `\n[Results truncated at ${maxResults}]`
        : '';

      const output = results
        .map(r => `${r.file}:${r.line}: ${r.content}`)
        .join('\n');

      return {
        callId: '',
        toolName: 'search_code',
        success: true,
        output: `${results.length} matches for "${pattern}":\n\n${output}${truncated}`,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        callId: '',
        toolName: 'search_code',
        success: false,
        output: '',
        error: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  }

  // ============================================================================
  // Internal helpers
  // ============================================================================

  private walkDir(
    dir: string,
    regex: RegExp,
    basePath: string,
    globPattern: string | undefined,
    results: Array<{ file: string; line: number; content: string }>,
    maxResults: number,
  ): void {
    if (results.length >= maxResults) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxResults) return;

      // Skip common non-source directories
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === 'dist' ||
        entry.name === '.next' ||
        entry.name === '__pycache__'
      ) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        this.walkDir(fullPath, regex, basePath, globPattern, results, maxResults);
      } else if (entry.isFile()) {
        // Apply glob filter if specified
        if (globPattern && !this.matchesGlob(entry.name, globPattern)) {
          continue;
        }
        // Only search text files by default
        const ext = path.extname(entry.name).toLowerCase();
        if (!globPattern && !TEXT_EXTENSIONS.has(ext)) {
          continue;
        }
        this.searchFile(fullPath, regex, basePath, results, maxResults);
      }
    }
  }

  private searchFile(
    filePath: string,
    regex: RegExp,
    basePath: string,
    results: Array<{ file: string; line: number; content: string }>,
    maxResults: number,
  ): void {
    if (results.length >= maxResults) return;

    // Skip files that are too large
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return;
    }
    if (stat.size > MAX_FILE_SIZE_BYTES) return;

    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return;
    }

    const lines = content.split('\n');
    const relPath = path.relative(basePath, filePath).replace(/\\/g, '/');

    for (let i = 0; i < lines.length; i++) {
      if (results.length >= maxResults) return;

      // Reset regex lastIndex for each line
      regex.lastIndex = 0;
      if (regex.test(lines[i])) {
        results.push({
          file: relPath,
          line: i + 1,
          content: lines[i].trim().slice(0, 200),
        });
      }
    }
  }

  private matchesGlob(filename: string, globPattern: string): boolean {
    // Simple glob matching: *.ts, *.tsx, *.{ts,tsx}, etc.
    const regexStr = globPattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\{/g, '(')
      .replace(/\}/g, ')')
      .replace(/,/g, '|');
    try {
      return new RegExp(`^${regexStr}$`, 'i').test(filename);
    } catch {
      return filename.includes(globPattern.replace(/^\*\./, ''));
    }
  }
}

/**
 * Create a GrepTool instance.
 */
export function createGrepTool(): GrepTool {
  return new GrepTool();
}
