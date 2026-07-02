import { FastifyInstance } from 'fastify';
import { execSync } from 'child_process';

const ALLOWLIST = ['npm', 'npx', 'node', 'git', 'tsc', 'dir', 'ls', 'cat', 'echo', 'cd', 'pwd', 'type', 'find', 'where', 'code', 'help', 'clear'];

export function registerCLIRoutes(app: FastifyInstance): void {
  app.post('/api/v1/cli/exec', async (request, reply) => {
    const body = request.body as { command?: string };
    if (!body?.command) return reply.code(400).send({ error: 'Command required' });

    const cmd = body.command.trim();
    if (cmd.length > 500) return reply.code(400).send({ error: 'Command too long (max 500 chars)' });

    try {
      const output = execSync(cmd, {
        timeout: 30000,
        maxBuffer: 1024 * 100,
        encoding: 'utf-8',
        windowsHide: true,
        shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
      });
      return { output: output || '(empty output)', exitCode: 0 };
    } catch (e: any) {
      const stderr = e.stderr?.toString() || '';
      const stdout = e.stdout?.toString() || '';
      return {
        output: stdout || '(no output)',
        error: stderr || e.message || 'Execution failed',
        exitCode: e.status ?? 1,
      };
    }
  });
}

