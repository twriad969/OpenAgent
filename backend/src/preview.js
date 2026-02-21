import express from 'express';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { nanoid } from 'nanoid';
import { db, nowPlusMinutes } from './db.js';
import { requireAuth } from './auth.js';
import { PROJECTS_ROOT } from './paths.js';

const previewMap = new Map();
let phpAvailable = false;

function purgeExpiredPreviewTokens() {
  db.prepare("DELETE FROM preview_access_tokens WHERE datetime(expires_at) <= datetime('now')").run();
}

export function checkPhpAvailable() {
  const result = spawnSync('php', ['-v'], { stdio: 'ignore' });
  phpAvailable = result.status === 0;
  if (!phpAvailable) {
    console.warn('PHP is not available. Preview will not work.');
  }
  return phpAvailable;
}

function randomPort() {
  return Math.floor(Math.random() * 1000) + 9000;
}

export function startPreview(projectId) {
  if (!phpAvailable) throw new Error('PHP is not available');

  const existing = previewMap.get(projectId);
  if (existing) return existing.port;

  const projectPath = path.join(PROJECTS_ROOT, projectId);
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  const port = randomPort();
  const processRef = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', projectPath], {
    stdio: 'ignore'
  });

  previewMap.set(projectId, { process: processRef, port });
  db.prepare('UPDATE projects SET preview_port = ?, updated_at = datetime(\'now\') WHERE id = ?').run(port, projectId);

  processRef.on('exit', () => {
    previewMap.delete(projectId);
    db.prepare('UPDATE projects SET preview_port = NULL, updated_at = datetime(\'now\') WHERE id = ?').run(projectId);
  });

  return port;
}

export function stopPreview(projectId) {
  const existing = previewMap.get(projectId);
  if (!existing) return;
  existing.process.kill();
  previewMap.delete(projectId);
  db.prepare('UPDATE projects SET preview_port = NULL, updated_at = datetime(\'now\') WHERE id = ?').run(projectId);
}

export const previewRouter = express.Router();
previewRouter.use(requireAuth);
previewRouter.get('/projects/:id/preview-url', (req, res) => {
  purgeExpiredPreviewTokens();

  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!project.preview_port) return res.status(404).json({ error: 'Preview not running' });

  db.prepare(
    `DELETE FROM preview_access_tokens
     WHERE project_id = ? AND user_id = ?`
  ).run(project.id, req.user.id);

  const previewToken = nanoid(40);
  db.prepare(
    `INSERT INTO preview_access_tokens (id, project_id, user_id, token, expires_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(nanoid(), project.id, req.user.id, previewToken, nowPlusMinutes(10));

  res.json({ url: `/preview/${project.id}/?previewToken=${encodeURIComponent(previewToken)}` });
});

export function getPhpStatus() {
  return phpAvailable;
}
