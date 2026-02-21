import express from 'express';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { db } from './db.js';
import { requireAuth } from './auth.js';
import { PROJECTS_ROOT } from './paths.js';

const previewMap = new Map();
let phpAvailable = false;

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
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!project.preview_port) return res.status(404).json({ error: 'Preview not running' });
  res.json({ url: `http://localhost:${project.preview_port}` });
});

export function getPhpStatus() {
  return phpAvailable;
}
