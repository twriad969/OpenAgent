# LandingForge

LandingForge is a full-stack AI website builder inspired by Lovable/Bolt workflows.

- **Frontend:** React + Vite + Tailwind
- **Backend:** Node.js (ESM) + Express + SQLite (`better-sqlite3`) + WebSocket (`ws`)
- **Auth:** Email + password
- **AI Engine:** OpenCode server (`opencode serve`)
- **Preview Runtime:** PHP built-in server per project

---

## Monorepo Structure

```text
.
├── frontend/    # React app (builder UI)
└── backend/     # API, auth, OpenCode orchestration, preview runtime
```

---

## Core Features

1. **Email/password auth** with persistent sessions.
2. **Project management** (create/list/view/delete).
3. **OpenCode session per project**.
4. **Async generation jobs** via OpenCode `prompt_async`.
5. **Realtime activity feed** over WebSocket from OpenCode SSE events.
6. **Live site preview** served with PHP on dynamic ports.
7. **File tree introspection** (`/api/projects/:id/files`) for generated output visibility.
8. **Prompt-first onboarding** (project auto-created from first prompt).
9. **Streaming builder telemetry** with event filtering + recent prompt history.

---

## Backend Technical Details

### Runtime

- Entry point: `backend/src/index.js`
- Uses secure defaults:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`

### Database

SQLite DB is initialized on boot in `backend/src/db.js` with tables:

- `users`
- `otp_codes`
- `auth_sessions`
- `projects`
- `jobs`

### Auth Flow

Routes in `backend/src/auth.js`:

- `POST /api/auth/signup` → create account
- `POST /api/auth/login` → sign in
- `POST /api/auth/logout`
- `GET /api/auth/me`

Passwords are salted+hashed using Node crypto scrypt.

### OpenCode Process + API Integration

Implemented in `backend/src/opencode.js`:

- Spawns: `opencode serve --port 4096 --hostname 127.0.0.1`
- Polls `GET /global/health` until ready
- Auto-restarts on crash/failure
- Supports optional `Authorization: Bearer ${OPENCODE_API_KEY}`
- Uses `parts` payload for prompts/messages with compatibility fallback

### Generation Pipeline

Implemented in `backend/src/generate.js`:

1. Validate auth/project/prompt
2. Create job record
3. Prime AGENTS context with `noReply: true`
4. Submit prompt via `prompt_async`
5. Consume OpenCode SSE `/event`
6. Map events to UI events (`status`, `token`, `tool_call`, `file_written`, `done`, `error`)
7. Start preview when generation completes

### Preview Runtime

Implemented in `backend/src/preview.js`:

- Starts `php -S 127.0.0.1:<port> -t <project_path>`
- Tracks process + port per project
- Exposes `GET /api/projects/:id/preview-url`

### WebSocket

Implemented in `backend/src/websocket.js`:

- Path: `/ws`
- Auth token via query string
- Client subscription message:

```json
{ "type": "subscribe", "projectId": "..." }
```

- Project ownership is verified before subscription.

---

## Frontend Technical Details

### Main Pages

- `Login.jsx` — sign-in/sign-up with email + password
- `Dashboard.jsx` — projects list/create/delete
- `Project.jsx` — realtime builder workspace

### Realtime UX

- `frontend/src/ws.js` provides:
  - singleton WS manager
  - auto reconnect with exponential backoff
  - re-subscription support
  - connection status callbacks

### API Client

- `frontend/src/api.js` centralizes fetch calls and auth headers.
- Includes robust JSON/error handling.

### UI Design System

Defined in `frontend/src/index.css` with reusable classes:

- `.panel`
- `.input`
- `.btn`
- `.btn-primary`
- `.badge`
- subtle motion classes (`.emotional-enter`, `.pulse-dot`)

---

## OpenCode Docs Verification Notes

OpenCode docs were re-checked from:

- `https://opencode.ai/docs/`
- `https://opencode.ai/docs/server/`
- `https://opencode.ai/docs/sdk/`

Current implementation aligns with documented patterns:

- session creation
- `parts` based prompts/messages
- async prompting
- SSE event stream consumption
- no-reply context priming

Detailed local notes: `backend/OPENCODE_API_NOTES.md`.

---

## Setup

### Prerequisites

- Node.js 20+
- npm
- PHP installed and available in `PATH`
- OpenCode CLI installed and available as `opencode` in `PATH`

### Install

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Run

Terminal 1:

```bash
cd backend
cp .env.example .env
npm run start
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Frontend default URL: `http://localhost:5173`
Backend default URL: `http://localhost:3001`

On the dashboard, users can enter their first prompt directly; the app creates a project and opens the builder automatically (Bolt/Lovable style kickoff).

---

## Health & Diagnostics

- Backend health endpoint: `GET /health`
  - includes `opencodeReady` and `phpAvailable`

If `opencodeReady` is `false`, verify OpenCode CLI installation and runtime credentials.

---

## Production Considerations

1. Replace in-memory rate-limiting with Redis or another distributed store.
2. Move session/auth token handling to secure cookies + CSRF protections if needed.
3. Add structured logging + tracing (pino/OpenTelemetry).
4. Run behind reverse proxy (Nginx/Caddy) with TLS.
5. Add queueing for generation jobs and per-user/project concurrency limits.
6. Add automated test suites (API integration + frontend e2e).



## Product Positioning

LandingForge is designed as a **modern PHP development platform** for AI-assisted site generation:

- Generate and iterate complete PHP projects from natural-language prompts.
- Stream status, tool calls, token output, and file-write activity live.
- Run isolated per-project preview servers for rapid visual feedback.
- Continue refining the same project with follow-up prompts in a persistent agent session.


## Builder UX Enhancements

The project builder includes advanced interaction features inspired by coding-agent products:

- Event stream filters (status/tool/file/token/error/done)
- Prompt suggestions for fast iterative prompting
- Recent prompt timeline (jobs)
- Quick action command palette (`Ctrl/Cmd + K`)
- Shortcut `/` to focus the prompt input
