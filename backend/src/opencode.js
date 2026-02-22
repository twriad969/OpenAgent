import { spawn } from 'node:child_process';

const OPENCODE_PORT = Number(process.env.OPENCODE_PORT || 4096);
const OPENCODE_HOST = '127.0.0.1';
const BASE_URL = `http://${OPENCODE_HOST}:${OPENCODE_PORT}`;
const OPENCODE_ENABLED = process.env.OPENCODE_ENABLED !== 'false';

let readyResolve;
export let opencodeReady = new Promise((resolve) => {
  readyResolve = resolve;
});

let ready = false;
let healthTimer;
let restartTimer;
let childProcess;

function authHeaders() {
  const token = process.env.OPENCODE_API_KEY;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function resetReadyPromise() {
  ready = false;
  opencodeReady = new Promise((resolve) => {
    readyResolve = resolve;
  });
}

function scheduleRestart() {
  if (healthTimer) clearInterval(healthTimer);
  if (restartTimer) clearTimeout(restartTimer);
  resetReadyPromise();
  restartTimer = setTimeout(spawnOpencode, 2000);
}

function startHealthPolling() {
  if (healthTimer) clearInterval(healthTimer);

  healthTimer = setInterval(async () => {
    try {
      const res = await fetch(`${BASE_URL}/global/health`, { headers: authHeaders() });
      if (res.ok && !ready) {
        ready = true;
        clearInterval(healthTimer);
        readyResolve();
        console.log('OpenCode is ready');
      }
    } catch {
      // keep polling
    }
  }, 500);
}

function spawnOpencode() {
  if (!OPENCODE_ENABLED) return;
  childProcess = spawn('opencode', ['serve', '--port', String(OPENCODE_PORT), '--hostname', OPENCODE_HOST], {
    stdio: 'inherit',
    env: process.env
  });

  startHealthPolling();

  childProcess.on('exit', (code, signal) => {
    console.error(`OpenCode exited (code=${code}, signal=${signal}). Restarting in 2s...`);
    scheduleRestart();
  });

  childProcess.on('error', (error) => {
    console.error(`Failed to start OpenCode: ${error.message}`);
    if (error.code === 'ENOENT') {
      console.error('OpenCode binary not found. Set OPENCODE_ENABLED=false for local testing without AI generation.');
      return;
    }
    scheduleRestart();
  });
}

export function startOpencode() {
  if (!OPENCODE_ENABLED) {
    ready = true;
    readyResolve();
    console.log('OpenCode disabled (OPENCODE_ENABLED=false). Running in local test mode.');
    return;
  }

  spawnOpencode();
}

export async function callOpencode(method, opencodePath, body, extraHeaders = {}) {
  await opencodeReady;
  const headers = {
    'content-type': 'application/json',
    ...authHeaders(),
    ...extraHeaders
  };

  if (!body) delete headers['content-type'];

  const res = await fetch(`${BASE_URL}${opencodePath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`OpenCode API error (${res.status}): ${text}`);
  }

  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') || '';
  return contentType.includes('application/json') ? res.json() : res.text();
}

export async function createOpencodeSession(title) {
  return callOpencode('POST', '/session', { title });
}

function toParts(message) {
  return [{ type: 'text', text: message }];
}

export async function sendSessionMessage(sessionId, message, options = {}, headers = {}) {
  const payload = { ...options, parts: options.parts || toParts(message) };
  try {
    return await callOpencode('POST', `/session/${sessionId}/message`, payload, headers);
  } catch {
    return callOpencode('POST', `/session/${sessionId}/message`, { ...options, message }, headers);
  }
}

export async function sendPromptAsync(sessionId, message, options = {}, headers = {}) {
  const payload = {
    ...options,
    parts: options.parts || toParts(message)
  };

  try {
    return await callOpencode('POST', `/session/${sessionId}/prompt_async`, payload, headers);
  } catch {
    return callOpencode('POST', `/session/${sessionId}/prompt_async`, { ...options, message }, headers);
  }
}

export function getOpencodeBaseUrl() {
  return BASE_URL;
}

export function getOpencodeHeaders() {
  return authHeaders();
}

export function isOpencodeEnabled() {
  return OPENCODE_ENABLED;
}
