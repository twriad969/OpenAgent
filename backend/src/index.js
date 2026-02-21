import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { authRouter } from './auth.js';
import { projectsRouter } from './projects.js';
import { generateRouter } from './generate.js';
import { previewRouter, checkPhpAvailable, getPhpStatus } from './preview.js';
import { setupWebsocketServer } from './websocket.js';
import { startOpencode, opencodeReady } from './opencode.js';
import { PROJECTS_ROOT } from './paths.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.disable('x-powered-by');
app.set('trust proxy', true);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', async (_req, res) => {
  let opencode = false;
  try {
    opencode = await Promise.race([
      opencodeReady.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 100))
    ]);
  } catch {
    opencode = false;
  }

  res.json({
    status: 'ok',
    opencodeReady: opencode,
    phpAvailable: getPhpStatus(),
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api', generateRouter);
app.use('/api', previewRouter);

app.get('/preview/:projectId/*', async (req, res, next) => {
  try {
    const { db } = await import('./db.js');
    const project = db.prepare('SELECT preview_port FROM projects WHERE id = ?').get(req.params.projectId);

    if (!project?.preview_port) return res.status(404).send('Preview not found');

    const subPath = req.params[0] || '';
    const target = `http://127.0.0.1:${project.preview_port}/${subPath}`;
    const proxied = await fetch(target);
    const body = await proxied.arrayBuffer();

    res.status(proxied.status);
    proxied.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });
    res.send(Buffer.from(body));
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);
setupWebsocketServer(server);

checkPhpAvailable();
startOpencode();

server.listen(PORT, () => {
  console.log(`LandingForge backend listening on http://localhost:${PORT}`);
  console.log(`Projects directory: ${PROJECTS_ROOT}`);
});
