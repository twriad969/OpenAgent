import express from 'express';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { nanoid } from 'nanoid';
import { db, nowPlusDays } from './db.js';

const scrypt = promisify(crypto.scrypt);

export const authRouter = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const derivedKey = await scrypt(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derivedKey.toString('hex'), 'hex'));
}

function createSession(userId) {
  const token = nanoid(48);
  db.prepare('INSERT INTO auth_sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)').run(
    nanoid(),
    userId,
    token,
    nowPlusDays(30)
  );
  return token;
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const session = db
    .prepare(
      `SELECT s.*, u.email FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')`
    )
    .get(token);

  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  req.user = { id: session.user_id, email: session.email, token: session.token };
  next();
}

export function getUserByToken(token) {
  if (!token) return null;
  return db
    .prepare(
      `SELECT u.* FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')`
    )
    .get(token);
}

authRouter.post('/signup', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'User already exists' });

  const userId = nanoid();
  const passwordHash = await hashPassword(password);

  db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(userId, email, passwordHash);

  const token = createSession(userId);
  const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(userId);
  return res.status(201).json({ token, user });
});

authRouter.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!isValidEmail(email) || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user?.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = createSession(user.id);
  return res.json({ token, user: { id: user.id, email: user.email, created_at: user.created_at } });
});

authRouter.post('/logout', requireAuth, (req, res) => {
  db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(req.user.token);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});
