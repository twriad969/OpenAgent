import { WebSocketServer } from 'ws';
import { getUserByToken } from './auth.js';
import { db } from './db.js';

const subscriptions = new Map();

function addSubscription(projectId, ws) {
  if (!subscriptions.has(projectId)) subscriptions.set(projectId, new Set());
  subscriptions.get(projectId).add(ws);
}

function removeSocket(ws) {
  for (const set of subscriptions.values()) {
    set.delete(ws);
  }
}

export function broadcastToProject(projectId, event) {
  const set = subscriptions.get(projectId);
  if (!set) return;

  const payload = JSON.stringify({
    ...event,
    projectId,
    timestamp: new Date().toISOString()
  });

  for (const ws of set) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

export function setupWebsocketServer(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const user = getUserByToken(token);

    if (!user) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === 'subscribe' && data.projectId) {
          const project = db
            .prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?')
            .get(data.projectId, user.id);

          if (!project) {
            ws.send(JSON.stringify({ type: 'error', message: 'Project access denied', projectId: data.projectId }));
            return;
          }

          addSubscription(data.projectId, ws);
          ws.send(
            JSON.stringify({
              type: 'status',
              projectId: data.projectId,
              message: 'subscribed',
              timestamp: new Date().toISOString()
            })
          );
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
      }
    });

    ws.on('close', () => removeSocket(ws));
    ws.on('error', () => removeSocket(ws));
  });

  return wss;
}
