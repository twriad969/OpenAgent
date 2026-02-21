import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { db } from './db.js';
import { requireAuth } from './auth.js';
import { createOpencodeSession } from './opencode.js';
import { stopPreview } from './preview.js';
import { PROJECTS_ROOT } from './paths.js';

export const projectsRouter = express.Router();
projectsRouter.use(requireAuth);

function readTree(root, current = root) {
  const entries = fs.readdirSync(current, { withFileTypes: true })
    .filter((entry) => entry.name !== '.git')
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));

  return entries.map((entry) => {
    const fullPath = path.join(current, entry.name);
    const relPath = path.relative(root, fullPath).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      return { type: 'dir', name: entry.name, path: relPath, children: readTree(root, fullPath) };
    }
    return {
      type: 'file',
      name: entry.name,
      path: relPath,
      size: fs.statSync(fullPath).size
    };
  });
}

projectsRouter.get('/', (req, res) => {
  const projects = db
    .prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC')
    .all(req.user.id);
  res.json({ projects });
});

projectsRouter.post('/', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();

  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (name.length > 120) return res.status(400).json({ error: 'Name is too long' });

  const id = nanoid();
  const dir = path.join(PROJECTS_ROOT, id);
  fs.mkdirSync(dir, { recursive: true });

  const session = await createOpencodeSession(name);
  const opencodeSessionId = session?.id || session?.sessionID || session?.sessionId;

  db.prepare(
    `INSERT INTO projects (id, user_id, name, description, status, opencode_session_id)
     VALUES (?, ?, ?, ?, 'idle', ?)`
  ).run(id, req.user.id, name, description || null, opencodeSessionId || null);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json({ project });
});

projectsRouter.get('/:id', (req, res) => {
  const project = db
    .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!project) return res.status(404).json({ error: 'Project not found' });

  const jobs = db
    .prepare('SELECT * FROM jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(project.id);

  res.json({ project, jobs });
});

projectsRouter.get('/:id/files', (req, res) => {
  const project = db
    .prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!project) return res.status(404).json({ error: 'Project not found' });

  const dir = path.join(PROJECTS_ROOT, project.id);
  fs.mkdirSync(dir, { recursive: true });
  const tree = readTree(dir);
  res.json({ tree });
});

projectsRouter.delete('/:id', (req, res) => {
  const project = db
    .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!project) return res.status(404).json({ error: 'Project not found' });

  stopPreview(project.id);
  const dir = path.join(PROJECTS_ROOT, project.id);
  fs.rmSync(dir, { recursive: true, force: true });

  db.prepare('DELETE FROM jobs WHERE project_id = ?').run(project.id);
  db.prepare('DELETE FROM projects WHERE id = ?').run(project.id);

  res.json({ ok: true });
});
