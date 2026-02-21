import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { db } from './db.js';
import { requireAuth } from './auth.js';
import {
  getOpencodeBaseUrl,
  getOpencodeHeaders,
  opencodeReady,
  sendPromptAsync,
  sendSessionMessage
} from './opencode.js';
import { broadcastToProject } from './websocket.js';
import { startPreview } from './preview.js';
import { AGENTS_PATH, PROJECTS_ROOT } from './paths.js';

export const generateRouter = express.Router();
generateRouter.use(requireAuth);

let sseStarted = false;
const primedSessions = new Set();

function resolveProjectId(payload) {
  const direct = payload?.projectId || payload?.metadata?.projectId || payload?.session?.metadata?.projectId;
  if (direct) return direct;

  const sessionId = payload?.sessionId || payload?.session?.id || payload?.properties?.sessionID;
  if (!sessionId) return null;

  const project = db.prepare('SELECT id FROM projects WHERE opencode_session_id = ?').get(sessionId);
  return project?.id || null;
}

function extractMessage(payload, fallback = 'Working...') {
  if (!payload) return fallback;
  return (
    payload.message ||
    payload.summary ||
    payload.content ||
    payload.text ||
    payload?.properties?.message ||
    payload?.properties?.title ||
    fallback
  );
}

function handleDone(projectId) {
  db.prepare("UPDATE projects SET status = 'done', updated_at = datetime('now') WHERE id = ?").run(projectId);
  db.prepare("UPDATE jobs SET status = 'done', finished_at = datetime('now') WHERE project_id = ? AND status = 'running'").run(projectId);

  try {
    startPreview(projectId);
  } catch (error) {
    console.warn('Unable to start preview:', error.message);
  }

  broadcastToProject(projectId, { type: 'done' });
}

function handleError(projectId, message) {
  db.prepare("UPDATE projects SET status = 'error', updated_at = datetime('now') WHERE id = ?").run(projectId);
  db.prepare("UPDATE jobs SET status = 'error', finished_at = datetime('now') WHERE project_id = ? AND status IN ('running', 'pending')").run(projectId);
  broadcastToProject(projectId, { type: 'error', message });
}

function routeEvent(eventType, payload) {
  const projectId = resolveProjectId(payload);
  if (!projectId) return;

  const evt = eventType || payload?.type;

  if (evt === 'error' || evt === 'session.error' || evt === 'run.error') {
    handleError(projectId, extractMessage(payload, 'Generation failed'));
    return;
  }

  if (evt === 'done' || evt === 'session.idle' || evt === 'run.completed') {
    handleDone(projectId);
    return;
  }

  if (evt.includes('file') || payload?.path) {
    broadcastToProject(projectId, {
      type: 'file_written',
      path: payload.path || payload?.properties?.path || payload?.properties?.file || payload?.file
    });
    return;
  }

  if (evt.includes('tool')) {
    broadcastToProject(projectId, {
      type: 'tool_call',
      tool: payload.tool || payload?.properties?.tool || payload?.properties?.name || 'tool',
      input: payload.input || payload?.properties?.input || ''
    });
    return;
  }

  if (evt.includes('token') || evt.includes('delta')) {
    broadcastToProject(projectId, {
      type: 'token',
      content: payload.content || payload.delta || payload?.properties?.text || ''
    });
    return;
  }

  broadcastToProject(projectId, {
    type: 'status',
    message: extractMessage(payload, evt || 'Working...')
  });
}

async function consumeEventStream() {
  const res = await fetch(`${getOpencodeBaseUrl()}/event`, {
    headers: {
      Accept: 'text/event-stream',
      ...getOpencodeHeaders()
    }
  });

  if (!res.ok || !res.body) throw new Error(`SSE connection failed (${res.status})`);

  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';

    for (const block of blocks) {
      let eventType = '';
      const data = [];

      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) eventType = line.slice(6).trim();
        if (line.startsWith('data:')) data.push(line.slice(5).trim());
      }

      if (!data.length) continue;

      try {
        const payload = JSON.parse(data.join('\n'));
        routeEvent(eventType, payload);
      } catch {
        // ignore non-json keepalive frames
      }
    }
  }
}

async function startEventStream() {
  if (sseStarted) return;
  sseStarted = true;

  await opencodeReady;

  while (true) {
    try {
      await consumeEventStream();
    } catch (error) {
      console.error('OpenCode SSE failed, retrying in 1s:', error.message);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

generateRouter.post('/projects/:id/generate', async (req, res) => {
  const project = db
    .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!project) return res.status(404).json({ error: 'Project not found' });

  const prompt = String(req.body.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
  if (prompt.length > 8000) return res.status(400).json({ error: 'Prompt is too long' });

  const jobId = nanoid();
  db.prepare('INSERT INTO jobs (id, project_id, user_id, prompt, status) VALUES (?, ?, ?, ?, ?)').run(
    jobId,
    project.id,
    req.user.id,
    prompt,
    'running'
  );
  db.prepare("UPDATE projects SET status = 'generating', updated_at = datetime('now') WHERE id = ?").run(project.id);

  const projectDir = path.join(PROJECTS_ROOT, project.id);
  fs.mkdirSync(projectDir, { recursive: true });

  const headers = { 'x-opencode-directory': projectDir };

  try {
    if (!primedSessions.has(project.opencode_session_id)) {
      const agentsContext = fs.readFileSync(AGENTS_PATH, 'utf8');
      await sendSessionMessage(project.opencode_session_id, agentsContext, { noReply: true }, headers);
      primedSessions.add(project.opencode_session_id);
    }

    await sendPromptAsync(project.opencode_session_id, prompt, { metadata: { projectId: project.id, jobId } }, headers);

    broadcastToProject(project.id, { type: 'status', message: 'Generation started' });

    startEventStream().catch((error) => {
      console.error('OpenCode SSE bootstrap failed:', error.message);
    });

    return res.status(204).send();
  } catch (error) {
    handleError(project.id, error.message);
    db.prepare("UPDATE jobs SET status = 'error', finished_at = datetime('now') WHERE id = ?").run(jobId);
    return res.status(500).json({ error: error.message });
  }
});
