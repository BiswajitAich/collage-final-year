# Devlog — Voice Agent Backend

> Last updated: 2026-07-04

---

## Architecture Overview

```
Browser (Next.js)
   │  POST /rooms/create { user_id, customer_id, name, phone_number }
   ▼
FastAPI (localhost:8000)
   ├── POST /rooms/create
   │     ├── create_room()         → LiveKit Cloud
   │     ├── create_token()        → returns JWT for browser
   │     └── dispatch_agent()      → tells LiveKit Cloud to place agent in room
   │
   ├── GET  /agent/tools           → returns ACTIVE workflows from DB (or mock)
   │
   └── POST /rooms/outbound-call   → SIP call via LiveKit (requires SIP trunk ID)
```

Two databases on same Postgres instance (Docker Compose):
- **`app`** — Prisma-managed tables (Workflow, User, etc.)
- **`n8n`** — n8n's own tables + `VoiceSession` (created on FastAPI startup via `Base.metadata.create_all`)

Two processes (started by `start.sh`):
1. **Agent** (`livekit_agent.py` dev mode) — connects to LiveKit Cloud, waits for dispatch, processes voice
2. **FastAPI** (`uv run fastapi dev`) — handles HTTP requests from browser

---

## Files

### Agent (`agent-repo/app/`)

| File | Purpose |
|------|---------|
| `livekit_agent.py` | Agent process — VAD, STT, LLM, TTS pipeline. Registers `assistant` agent. |
| `prompts.py` | System prompt for the LLM + end-call tool instructions |
| `main.py` | FastAPI entry — lifespan creates DB tables, mounts routers |
| `routers/rooms.py` | Room creation, outbound SIP, end session, session status |
| `routers/agent.py` | Tool registry endpoint — reads from DB or mock |
| `routers/webhook.py` | LiveKit webhooks (room_finished → end session) |
| `services/livekit_service.py` | LiveKit API client — room mgmt, tokens, SIP, agent dispatch |
| `services/session_service.py` | CRUD for `VoiceSession` table |
| `models.py` | SQLAlchemy `VoiceSession` model + `SessionStatus` enum |
| `schemas.py` | Pydantic schemas for API requests/responses |
| `config.py` | All env vars loaded from `.env` |
| `database.py` | SQLAlchemy async engine/session factory (connects to **n8n** DB) |
| `start.sh` | Launch script — agent (bg) + FastAPI (fg) |
| `.env` | **All secrets** — see "Env Vars" section |

### Frontend (`frontend-repo/`)

| File | Purpose |
|------|---------|
| `app/(dashboard)/live-assistant/page.tsx` | Live assistant page — form (name/phone), start/end call |
| `app/(dashboard)/live-assistant/types.ts` | Constants: `DEFAULTS` (env-fallback), `FASTAPI_BASE_URL` |
| `app/(dashboard)/live-assistant/_components/` | BrowserCallView, MobileCallView, CallEndedView |
| `app/(dashboard)/tools/page.tsx` | Tool registry page — now reads from DB, not mock |
| `app/(dashboard)/tools/action.ts` | Server actions: `getDbTools()`, `updateDbToolStatus()`, `syncDbTool()` |
| `lib/api/services.ts` | Old mock service — suppressed with `// @ts-nocheck` |

---

## Env Vars (`.env` files)

### `agent-repo/.env`

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | Postgres async URL to **n8n** database (e.g. `postgresql+asyncpg://n8n:n8n@localhost:5432/n8n`) |
| `LIVEKIT_URL` | ✅ | LiveKit Cloud WS URL |
| `LIVEKIT_API_KEY` | ✅ | LiveKit Cloud API key |
| `LIVEKIT_API_SECRET` | ✅ | LiveKit Cloud API secret |
| `LIVEKIT_SIP_TRUNK_ID` | ❌ | Required only for outbound SIP calls |
| `USE_MOCK_TOOLS` | ❌ | `true` → use hardcoded mock tools; `false` → read from DB |
| `AGENT_NAME` | ❌ | Default `assistant` |
| `FRONTEND_ORIGINS` | ❌ | CORS origins, default `http://localhost:3000` |
| `TOOLS_API_URL` | ❌ | Default `http://localhost:8000/agent/tools` |
| `ROOM_EMPTY_TIMEOUT_SEC` | ❌ | Default `300` |
| `ROOM_MAX_PARTICIPANTS` | ❌ | Default `10` |
| `TOKEN_TTL_SEC` | ❌ | Default `3600` |

### `frontend-repo/.env.local`

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_FASTAPI_BASE_URL` | Default `http://localhost:8000` |
| `NEXT_PUBLIC_DEFAULT_USER_ID` | Fallback when no auth session |
| `NEXT_PUBLIC_DEFAULT_CUSTOMER_ID` | Fallback when no auth session |
| `NEXT_PUBLIC_DEFAULT_NAME` | Fallback when no auth session |
| `NEXT_PUBLIC_DEFAULT_PHONE_NUMBER` | Fallback when no auth session |

---

## Latest Fixes (2026-07-04)

### 1. Prompt leaking fixed
**Problem:** Agent was repeating the system prompt back to the user (e.g., "I am a friendly, reliable voice assistant...").
**Root cause:** The prompt was too verbose with markdown headers (`# Output rules`, `# Guardrails`, etc.) — the LLM treated it as conversation text.
**Fix:** Rewrote to 8 terse lines in `prompts.py`:
- No headers, no fluff, no "Output rules" sections
- Just: who you help, what you know, what to do when asked, never ask for ID
- `{{tools_summary}}` still renders the actual tool list

### 2. Function tool names leaking into conversation
**Problem:** LLM treated function names as conversation text. User asked "who am I" → agent said "who I am" back.
**Fix:** Renamed to natural descriptions:
- `who_am_i` → `get_call_info` ("Return who is calling — name, user ID, phone number.")
- `list_available_tools` → `list_tools` ("Return the list of tools the assistant can run.")
- `run_registered_tool` → `run_tool` ("Run one of the available tools by name. Pass parameters as JSON.")

### 3. Tools now properly fetched from the `app` database
**Problem:** The agent's `/agent/tools` endpoint was querying the `n8n` database for the `Workflow` table (which lives in the `app` database), so DB fetch failed silently.
**Root cause:** `APP_DATABASE_URL` was either unset or fell back to `DATABASE_URL` (the n8n database).
**Fixes:**
- `config.py`: `APP_DATABASE_URL` no longer falls back to `DATABASE_URL` — empty means "don't query DB"
- `agent.py` (`_fetch_from_db`): returns empty list if `APP_DATABASE_URL` is not set, wrapped in try/except with a log warning
- Agent now gracefully handles zero tools (no crash, generic greeting)
- User must set `APP_DATABASE_URL` in `agent-repo/.env`:
  ```
  APP_DATABASE_URL=postgresql+asyncpg://admin:admin123@localhost:5432/app
  ```
  (same as frontend's Prisma `DATABASE_URL` but with `+asyncpg`)

### 4. Auto-inject customer_id in tool calls
`run_tool` fills in `customer_id` from call metadata if the payload is missing it — the LLM never needs to ask.

### 5. on_enter auto-looks up customer
If the `customers-details` tool is registered, the agent pre-fetches customer info on call start and uses it in the greeting. If lookup fails or no tools exist, it falls back to a generic greeting.

---

## Fixes Applied (previous)

### 1. Agent silent on calls (HIGH PRIORITY — STILL TESTING)

**Root cause (suspected):** `preemptive_generation=False` in `AgentSession()` was deprecated. The deprecated parameter may silently block all LLM reply generation — including the `on_enter` greeting and responses to user speech.

**Fix:** Replaced with new API:
```python
turn_handling={
    "preemptive_generation": {"enabled": True},
},
```

**Log evidence from last run:**
```
19:11:10.219  WARNING  preemptive_generation is deprecated
...
19:11:14.730  DEBUG    flush audio emitter due to slow audio generation
```
No STT/LLM/TTS activity logged at all after session start.

**To test:** Restart `./start.sh`, call in, check if agent speaks. If still silent, the issue is deeper (API keys in LiveKit Cloud Console not configured for AssemblyAI/Deepgram/Gemini).

### 2. Prompt variables fixed

**Problem:** Prompts used `{{metadata.user_id}}` and `{{metadata.caller_phone_number}}` which the `VariableTemplater.render()` didn't support — it only replaces `{{user_id}}` and `{{caller_phone_number}}` (without the `metadata.` prefix).

**Fix:** Changed prompts to use the short form (`{{user_id}}`, `{{caller_phone_number}}`).

### 3. `{{tools_summary}}` added to prompt

**Problem:** Agent didn't know what tools it had — the system prompt said "You have access to tools" but never listed them.

**Fix:** Added `{{tools_summary}}` placeholder in `agent_prompt`, and the `DefaultAgent.__init__` passes `extra={"tools_summary": tool_registry.summary_text()}` to `self._templater.render()`.

### 4. "User not verified" removed from EndCallTool

**Problem:** The `EndCallTool extra_description` said "End the call when user is not verified" — causing the LLM to end calls preemptively.

**Fix:** Removed that sentence.

### 5. Greeting changed in `on_enter`

**Old:** "Greet the user by name if you know it, and offer your assistance."
**New:** "Greet the user by name if you know it. Introduce yourself as an AI assistant."

**Reason:** User report showed agent echoing "how can I help you" back as "how about you" — the old wording may have triggered question-mirroring.

### 6. `VoiceSession` table auto-created on FastAPI startup

**Problem:** Table didn't exist — `session_service.create_session()` would crash.

**Fix:** Added `Base.metadata.create_all` in `main.py` lifespan:
```python
async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)
```

### 7. `start.sh` created

**Problem:** Needed two terminals (agent + FastAPI).
**Fix:** Single script — agent in background, FastAPI in foreground, cleanup on Ctrl+C.

### 8. Live assistant form de-hardcoded

**Problem:** `userId`, `customerId`, `name`, `phoneNumber` were hardcoded strings in `page.tsx`.
**Fix:**
- `userId` → auto-filled from auth (`getUser().id`), hidden from UI
- `customerId` → auto-filled from user email, hidden from UI
- `name` → auto-filled from auth profile, editable
- `phoneNumber` → env default, editable
- `DEFAULTS` object in `types.ts` reads `NEXT_PUBLIC_DEFAULT_*` env vars

### 9. Tools page swapped from mock to DB

**Old:** Used `toolService.getTools()` (mock data).
**New:** Uses `getDbTools()`, `updateDbToolStatus()`, `syncDbTool()` from `./action` (real DB server actions).

Columns updated: `label` | `apiBaseUrl` | `category` | `n8nType` | `status` | `lastSync`.

### 10. Mock data files suppressed

**Files:** `lib/api/services.ts`, `lib/api/mock-data/*.data.ts`
**Fix:** Added `// @ts-nocheck` to stop build errors from enum casing mismatches (Prisma `ACTIVE` vs lowercase `active` after `prisma db push`).

### 11. Build errors fixed (12 total)

All Prisma enum casing mismatches — mock data had lowercase values but `db push` created UPPERCASE enums. Fixed with `String()` casts or `as` assertions across:
- `stores/index.ts` (import path)
- `app/api/workflow/deploy/route.ts` (stub)
- `components/ui/UIComponents.tsx` (prop type)
- `app/(dashboard)/logs/page.tsx` (level comparison)
- `app/(dashboard)/tools/page.tsx` (StatusFilter values)
- `app/(dashboard)/workflows/[workflowId]/edit/page.tsx` (nullable fields)
- `app/(dashboard)/workflows/new/action.ts` (revalidateTag)
- `lib/workflow/index.ts` (removed deleted type re-exports)
- `lib/api/services.ts` (import order)

---

## Agent Pipeline

```
User speaks
   → Silero VAD detects end-of-turn
   → AssemblyAI STT transcribes (model: universal-streaming-multilingual)
   → Google Gemini 2.5 Flash Lite generates reply
   → Deepgram Aura-2 TTS speaks (voice: athena)
```

All inference goes through LiveKit Cloud's inference proxy — API keys for AssemblyAI, Deepgram, and Google are configured in **LiveKit Cloud Console**, not in `.env`.

---

## Known Blockers

| Blocker | Status |
|---------|--------|
| Agent not speaking during call | FIX APPLIED — needs testing |
| `LIVEKIT_SIP_TRUNK_ID=''` in `.env` | Needs user to create SIP trunk in LiveKit Console |
| `N8N_POSTGRES_CREDENTIAL_ID=''` in frontend `.env` | Needs user to create Postgres credential in n8n UI |

---

## Next Steps

1. **Test agent voice** — restart `start.sh`, make a call, confirm greeting + response
2. If still silent: check LiveKit Cloud Console → Inference → verify API keys for AssemblyAI, Deepgram, Gemini
3. Add LLM streaming with `streamText()` for perceived instant generation
4. Optimistic UI for workflow activate/deactivate toggles
5. If agent speaks but slow: investigate `"flush audio emitter due to slow audio generation"` — might need smaller model or shorter prompt

---

## Call Flow Summary

1. User clicks "Start call" in browser
2. Frontend POSTs to `/rooms/create` with user/customer info
3. FastAPI:
   a. Creates LiveKit room
   b. Mints JWT token for browser
   c. Dispatches agent `assistant` to room
   d. Creates `VoiceSession` row in n8n database
4. Browser connects to LiveKit Cloud with token + audio
5. Agent process receives job → loads VAD → loads tools from `/agent/tools` → starts session
6. Agent greets user, processes conversation via STT→LLM→TTS pipeline
7. On end: user clicks "End Call" → POST `/rooms/end` → session marked ENDED
