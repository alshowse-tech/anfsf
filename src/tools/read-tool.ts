/**
 * ANFSF — File Read Tool
 *
 * Reads file contents from disk. Readonly — does not modify state.
 * Path validation against allowedPaths prevents directory traversal.
 *
 * Phase 2: Tool System Infrastructure
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Tool, ToolDefinition, ToolResult, ToolContext } from './types';

// ============================================================================
// Path validation
// ============================================================================

const SAFE_PATH_RE = /^[a-zA-Z0-9_\-\.\/\\]+$/;

function validatePath(filePath: string, allowedPaths: string[]): string | null {
  // Reject empty or suspicious paths
  if (!filePath || !filePath.trim()) return 'Empty path';
  if (filePath.includes('..')) return 'Path traversal detected';
  if (!SAFE_PATH_RE.test(filePath)) return `Invalid characters in path: ${filePath}`;

  const resolved = path.resolve(filePath);
  const normalized = resolved.replace(/\\/g, '/');

  if (allowedPaths.length > 0) {
    const isAllowed = allowedPaths.some(allowed => {
      const resolvedAllowed = path.resolve(allowed).replace(/\\/g, '/');
      return normalized.startsWith(resolvedAllowed);
    });
    if (!isAllowed) {
      return `Path "${filePath}" is outside allowed directories`;
    }
  }

  return null; // valid
}

// ============================================================================
// ReadTool
// ============================================================================

const READ_TOOL_DEFINITION: ToolDefinition = {
  name: 'read_file',
  description:
    'Read the contents of a file. Supports optional line offset and limit ' +
    'for reading large files in chunks. Returns the file content as text.',
  parameters: [
    {
      name: 'file_path',
      type: 'string',
      description: 'Absolute or relative path to the file to read',
      required: true,
    },
    {
      name: 'offset',
      type: 'number',
      description: 'Line number to start reading from (1-indexed, default: 1)',
      required: false,
      default: 1,
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Maximum number of lines to read (default: 2000)',
      required: false,
      default: 2000,
    },
  ],
  mode: 'readonly',
  requiresSandbox: false,
};

export class ReadTool implements Tool {
  readonly definition: ToolDefinition = READ_TOOL_DEFINITION;

  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const filePath = String(params.file_path ?? '');
    const offset = Number(params.offset ?? 1);
    const limit = Number(params.limit ?? 2000);

    // Resolve relative paths against working dir
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(context.workingDir, filePath);

    // Validate path
    const pathError = validatePath(resolved, context.allowedPaths ?? []);
    if (pathError) {
      return {
        callId: '',
        toolName: 'read_file',
        success: false,
        output: '',
        error: pathError,
        durationMs: 0,
      };
    }

    // Check file exists
    if (!fs.existsSync(resolved)) {
      return {
        callId: '',
        toolName: 'read_file',
        success: false,
        output: '',
        error: `File not found: ${filePath}`,
        durationMs: 0,
      };
    }

    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return {
        callId: '',
        toolName: 'read_file',
        success: false,
        output: '',
        error: `Path is a directory, not a file: ${filePath}`,
        durationMs: 0,
      };
    }

    // Read file
    try {
      const content = fs.readFileSync(resolved, 'utf-8');
      const lines = content.split('\n');

      // Apply offset/limit
      const startIdx = Math.max(0, offset - 1);
      const endIdx = Math.min(lines.length, startIdx + limit);
      const selectedLines = lines.slice(startIdx, endIdx);

      const output = selectedLines
        .map((line, i) => `${String(startIdx + i + 1).padStart(6, ' ')}\t${line}`)
        .join('\n');

      const header = `File: ${filePath} (lines ${startIdx + 1}-${endIdx} of ${lines.length})\n\n`;

      return {
        callId: '',
        toolName: 'read_file',
        success: true,
        output: header + output,
        durationMs: 0,
      };
    } catch (error) {
      return {
        callId: '',
        toolName: 'read_file',
        success: false,
        output: '',
        error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: 0,
      };
    }
  }
}

/**
 * Create a ReadTool instance.
 */
export function createReadTool(): ReadTool {
  return new ReadTool();
}
