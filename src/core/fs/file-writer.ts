/**
 * ANFSF — File writer utility.
 * Takes GeneratedFile[] from architect modules and writes them to disk.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedFile {
  path: string;
  content: string;
  type?: string;
}

export interface WriteReport {
  written: string[];
  skipped: string[];
  errors: { path: string; error: string }[];
  totalWritten: number;
  totalBytes: number;
}

export interface WriteOptions {
  /** Base output directory. Default: ./output */
  outputDir?: string;
  /** If true, skip existing files. Default: false (overwrite) */
  skipExisting?: boolean;
  /** Optional prefix subdirectory (e.g. "frontend", "backend") */
  subDir?: string;
}

/**
 * Write generated files to disk.
 */
export async function writeGeneratedFiles(
  files: GeneratedFile[],
  options: WriteOptions = {}
): Promise<WriteReport> {
  const {
    outputDir = './output',
    skipExisting = false,
    subDir,
  } = options;

  const baseDir = subDir ? path.join(outputDir, subDir) : outputDir;
  const report: WriteReport = { written: [], skipped: [], errors: [], totalWritten: 0, totalBytes: 0 };

  if (files.length === 0) return report;

  for (const file of files) {
    const targetPath = path.resolve(baseDir, file.path);

    if (skipExisting && fs.existsSync(targetPath)) {
      report.skipped.push(file.path);
      continue;
    }

    try {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, file.content, 'utf-8');
      report.written.push(file.path);
      report.totalWritten++;
      report.totalBytes += Buffer.byteLength(file.content, 'utf-8');
    } catch (e) {
      report.errors.push({
        path: file.path,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return report;
}

/**
 * Write frontend and backend generated files together, organized into
 * `frontend/` and `backend/` subdirectories.
 */
export async function writeProjectFiles(
  frontendFiles: GeneratedFile[],
  backendFiles: GeneratedFile[],
  outputDir: string = './output'
): Promise<{ frontend: WriteReport; backend: WriteReport }> {
  const [frontend, backend] = await Promise.all([
    writeGeneratedFiles(frontendFiles, { outputDir, subDir: 'frontend' }),
    writeGeneratedFiles(backendFiles, { outputDir, subDir: 'backend' }),
  ]);

  return { frontend, backend };
}
