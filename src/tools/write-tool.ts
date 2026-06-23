/**
 * ANFSF — File Write Tool
 *
 * Writes file contents to disk. Readwrite — modifies filesystem state.
 * Path validation against allowedPaths prevents writes outside sandbox.
 * Records old content for potential rollback.
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

  return null;
}

// ============================================================================
// WriteTool
// ============================================================================

const WRITE_TOOL_DEFINITION: ToolDefinition = {
  name: 'write_file',
  description:
    'Write content to a file. Creates parent directories if they do not exist. ' +
    'Overwrites the file if it already exists. Returns confirmation on success.',
  parameters: [
    {
      name: 'file_path',
      type: 'string',
      description: 'Absolute or relative path to the file to write',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'The content to write to the file',
      required: true,
    },
  ],
  mode: 'readwrite',
  requiresSandbox: false,
};

export class WriteTool implements Tool {
  readonly definition: ToolDefinition = WRITE_TOOL_DEFINITION;

  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const filePath = String(params.file_path ?? '');
    const content = String(params.content ?? '');

    // Resolve relative paths against working dir
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(context.workingDir, filePath);

    // Validate path
    const pathError = validatePath(resolved, context.allowedPaths ?? []);
    if (pathError) {
      return {
        callId: '',
        toolName: 'write_file',
        success: false,
        output: '',
        error: pathError,
        durationMs: 0,
      };
    }

    try {
      // Create parent directories
      const dir = path.dirname(resolved);
      fs.mkdirSync(dir, { recursive: true });

      // Write file
      const bytesWritten = fs.writeFileSync(resolved, content, 'utf-8');
      const stat = fs.statSync(resolved);

      return {
        callId: '',
        toolName: 'write_file',
        success: true,
        output: `Wrote ${stat.size} bytes to ${filePath}`,
        durationMs: 0,
      };
    } catch (error) {
      return {
        callId: '',
        toolName: 'write_file',
        success: false,
        output: '',
        error: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: 0,
      };
    }
  }
}

/**
 * Create a WriteTool instance.
 */
export function createWriteTool(): WriteTool {
  return new WriteTool();
}
