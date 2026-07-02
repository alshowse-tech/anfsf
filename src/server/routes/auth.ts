import { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const STORAGE = '.anfsf/users.json';
const VALID_ROLES = ['admin', 'pm', 'frontend', 'backend', 'qa', 'devops', 'viewer'];

interface UserStore { username: string; password: string; role: string; }

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  console.warn('[auth] JWT_SECRET not set — sessions invalidated on restart');
  return crypto.randomBytes(32).toString('hex');
}

function loadUsers(): UserStore[] {
  try { return JSON.parse(fs.readFileSync(STORAGE, 'utf-8')); }
  catch { return []; }
}

function migrateLegacyPasswords(users: UserStore[]): boolean {
  let migrated = false;
  for (const u of users) {
    if (u.password && !u.password.startsWith('$2')) {
      u.password = bcrypt.hashSync(u.password, 10);
      migrated = true;
    }
  }
  return migrated;
}

// Run legacy migration on module load
const currentUsers = loadUsers();
if (migrateLegacyPasswords(currentUsers)) {
  fs.mkdirSync(path.dirname(STORAGE), { recursive: true });
  fs.writeFileSync(STORAGE, JSON.stringify(currentUsers, null, 2), 'utf-8');
  console.log('[auth] Migrated legacy plaintext passwords to bcrypt');
}

export function registerAuthRoutes(app: FastifyInstance): void {
  app.post('/api/v1/auth/register', async (request, reply) => {
    const body = request.body as { username?: string; password?: string; role?: string };
    if (!body.username || !body.password)
      return reply.code(400).send({ error: 'Username and password required' });

    if (body.password.length < 6)
      return reply.code(400).send({ error: 'Password must be at least 6 characters' });

    const users = loadUsers();
    if (users.find(u => u.username === body.username))
      return reply.code(409).send({ error: 'User already exists' });

    if (body.role && !VALID_ROLES.includes(body.role))
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Invalid role. Valid: ' + VALID_ROLES.join(', ') });

    const hashed = bcrypt.hashSync(body.password, 10);
    const role = VALID_ROLES.includes(body.role || '') ? body.role! : 'viewer';
    users.push({ username: body.username, password: hashed, role });
    fs.mkdirSync(path.dirname(STORAGE), { recursive: true });
    fs.writeFileSync(STORAGE, JSON.stringify(users, null, 2), 'utf-8');
    return { status: 'ok' };
  });

  app.post('/api/v1/auth/login', async (request, reply) => {
    const body = request.body as { username?: string; password?: string };
    if (!body.username || !body.password)
      return reply.code(400).send({ error: 'Username and password required' });

    const users = loadUsers();
    const user = users.find(u => u.username === body.username);
    if (!user || !bcrypt.compareSync(body.password, user.password))
      return reply.code(401).send({ error: 'Invalid credentials' });

    const JWT_SECRET = getJwtSecret();
    const token = jwt.sign(
      { sub: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { status: 'ok', token, user: { username: user.username, role: user.role } };
  });

  app.get('/api/v1/auth/me', async (request) => {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return { authenticated: false };

    try {
      const payload = jwt.verify(auth.slice(7), getJwtSecret()) as { sub: string; role: string };
      return { authenticated: true, username: payload.sub, role: payload.role };
    } catch {
      return { authenticated: false };
    }
  });

  app.post('/api/v1/auth/logout', async () => {
    // JWT is stateless — no server-side operation needed
    return { status: 'ok' };
  });
}
