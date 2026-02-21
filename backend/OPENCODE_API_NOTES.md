# OpenCode API Integration Notes

These notes summarize publicly documented endpoints and payload patterns from:

- https://opencode.ai/docs/
- https://opencode.ai/docs/server/
- https://opencode.ai/docs/sdk/

## Endpoints used by LandingForge

- `GET /global/health` — readiness probe for `opencode serve`.
- `POST /session` — create one OpenCode session per project.
- `POST /session/:id/message` — synchronous message send.
- `POST /session/:id/prompt_async` — async generation kick-off.
- `GET /event` — server-sent events stream (starts with `server.connected`, then bus events).

## Message body format

Docs and SDK examples emphasize `parts` arrays for prompts/messages:

```json
{
  "parts": [{ "type": "text", "text": "Hello" }]
}
```

LandingForge sends `parts` first and keeps a compatibility fallback using `message` for older behavior.

## noReply context priming

SDK docs show `noReply: true` for injecting context without triggering a response. LandingForge uses this to send AGENTS instructions once per session before user prompts.

## Operational headers

- `x-opencode-directory`: scope operations to project directory.
- `Authorization: Bearer <OPENCODE_API_KEY>`: sent when configured.

## Event mapping strategy

SSE event names can vary by version. LandingForge maps both generic and namespaced forms (for example: `done`, `session.idle`, `run.completed`) to stable frontend events.
