# Live Assistant Call Flow

## Architecture

```
Browser (Next.js :3000)
  │ fetch()
  ▼
FastAPI (:8000)
  ├── rooms.py     → /rooms/create, /rooms/outbound-call, /rooms/end
  ├── agent.py     → /agent/tools, /agent/tools/reload
  └── webhook.py   → /webhook/livekit (LiveKit events)
  │
  ├── LiveKit Cloud API → room mgmt, token minting, agent dispatch, SIP trunk
  ├── PostgreSQL → VoiceSession table
  └── livekit_agent.py → long-lived agent process (STT→LLM→TTS pipeline)
```

## Step-by-step

### 1. Page Load
- `getUser()` server action reads `user` cookie → sets `userId`, `name` from auth
- Setup card shows Name + Phone Number fields

### 2. Start Call (Browser mode)
Click "Start call" → `startCall()`:

```
POST /rooms/create
Body: { user_id, customer_id, name, phone_number }

Response: { session_id, room_name, token, livekit_url }
```

**FastAPI `/rooms/create` does:**
1. `livekit_service.create_room(room_name)` → LiveKit Cloud `CreateRoomRequest` (empty_timeout=300s)
2. `livekit_service.create_participant_token(...)` → mints LiveKit JWT (room_join, can_publish, can_subscribe, TTL 1h)
3. `livekit_service.dispatch_agent(room_name, metadata)` → `CreateAgentDispatchRequest` with `agent_name="assistant"` → LiveKit spawns agent
4. `session_service.create_session(db, ...)` → `VoiceSession` row (status=PENDING)

Frontend gets response → renders `<LiveKitRoom>` → WebSocket connects to LiveKit Cloud using token.

**Agent process (`livekit_agent.py`) starts inside room:**
1. `GET /agent/tools` → loads tool registry (mock or DB)
2. Creates `AgentSession`:
   - STT: `assemblyai/universal-streaming-multilingual`
   - LLM: `google/gemini-2.5-flash-lite`
   - TTS: `deepgram/aura-2` (voice: `athena`)
   - VAD: `silero.VAD` (local ONNX)
3. Creates `DefaultAgent` with prompt template + tools
4. `session.start(agent, room)` → agent enters room
5. `on_enter()` → auto-greets user

### 3. Start Call (Mobile mode)
Same as browser + extra step:

```
POST /rooms/outbound-call
Body: { session_id, phone_number, name }

Response: { ok: true, message: "Call initiated to +91...", participant_identity }
```

FastAPI uses `LIVEKIT_SIP_TRUNK_ID` → LiveKit `CreateSIPParticipantRequest` → phone rings.

Mobile UI shows minimal "Calling..." screen (no WebRTC — user on real phone via SIP).

### 4. During Call

**Audio pipeline:**
```
User mic → WebRTC → LiveKit Cloud → STT (AssemblyAI) → LLM (Gemini) → TTS (Deepgram) → WebRTC → User hears
```

**Browser UI** (`BrowserCallView`):
- Mic auto-enabled on connect
- `useMicLevel` hook reads mic amplitude via Web Audio API
- Agent state: waiting / listening / speaking (from `remoteParticipants[].isSpeaking`)
- Mute/unmute, timer, end call

**Agent tools:**

| Tool | Function |
|---|---|
| `list_available_tools` | List all tools in registry |
| `who_am_i` | Return agent metadata (user_id, name, phone) |
| `run_registered_tool` | Execute tool by name → HTTP call to n8n webhook endpoint |
| `EndCallTool` | End call on goodbye/silence/unverified; `delete_room=True` |

**Mock tools** (when `USE_MOCK_TOOLS=true`, current config):

| Name | Method | Endpoint |
|---|---|---|
| `customers-status` | GET | `http://localhost:5678/webhook/users/customer-status` |
| `customers-details` | GET | `http://localhost:5678/webhook/frontend-test-4` |

When `USE_MOCK_TOOLS=false` → tools come from `Workflow` table in n8n DB (active workflows with webhook URLs).

### 5. End Call

**Path A — User clicks "End Call":**
```
POST /rooms/end
Body: { session_id }
```
FastAPI → `session_service.end_session()` → DB: status=ENDED, endTime=now, durationSec computed.

**Path B — Agent ends call (goodbye/silence):**
1. Agent's `EndCallTool` → LiveKit API `DeleteRoom`
2. Browser's LiveKitRoom gets `DisconnectReason.ROOM_DELETED` → `endCall('agent')` → same `POST /rooms/end`

**Path C — LiveKit webhook (fallback):**
- `room_finished` event → `POST /webhook/livekit`
- Webhook handler → marks any non-ended sessions for that room as FAILED

## AI Model Stack

| Component | Provider | Model |
|---|---|---|
| STT | AssemblyAI | `universal-streaming-multilingual` |
| LLM | Google Gemini | `gemini-2.5-flash-lite` |
| TTS | Deepgram | `aura-2` (voice: `athena`) |
| VAD | Silero | `silero_vad.onnx` (local) |

## API Endpoints

| Method | Path | From | Purpose |
|---|---|---|---|
| POST | `/rooms/create` | Frontend startCall() | Create room, dispatch agent, mint token |
| POST | `/rooms/outbound-call` | Frontend startCall() (mobile) | SIP outbound call to phone |
| POST | `/rooms/end` | Frontend endCall() | End session, save stats |
| GET | `/rooms/{id}/status` | (unused by FE) | Poll session status |
| GET | `/agent/tools` | Agent startup | Load tool registry |
| POST | `/agent/tools/reload` | (admin) | Force-refresh tool list |
| POST | `/webhook/livekit` | LiveKit Cloud | Room lifecycle events |

## Key Files

| File | Role |
|---|---|
| `frontend-repo/app/(dashboard)/live-assistant/page.tsx` | Main page, startCall/endCall |
| `frontend-repo/app/(dashboard)/live-assistant/types.ts` | `FASTAPI_BASE_URL`, `DEFAULTS` |
| `frontend-repo/app/(dashboard)/live-assistant/_components/BrowserCallView.tsx` | In-call browser UI |
| `frontend-repo/app/(dashboard)/live-assistant/_components/MobileCallView.tsx` | In-call mobile UI |
| `frontend-repo/app/(dashboard)/live-assistant/_components/CallEndedView.tsx` | Post-call screen |
| `frontend-repo/app/(dashboard)/live-assistant/_hooks/useMikeLevel.ts` | Mic amplitude visualization |
| `agent-repo/app/routers/rooms.py` | `/rooms/create`, `/rooms/outbound-call`, `/rooms/end` |
| `agent-repo/app/routers/agent.py` | `/agent/tools`, `/agent/tools/reload` |
| `agent-repo/app/routers/webhook.py` | `/webhook/livekit` |
| `agent-repo/app/services/livekit_service.py` | LiveKit API client |
| `agent-repo/app/services/session_service.py` | Session CRUD |
| `agent-repo/app/livekit_agent.py` | Agent process (STT→LLM→TTS pipeline) |
| `agent-repo/app/prompts.py` | LLM prompt templates |
| `agent-repo/app/config.py` | Backend env config |
| `agent-repo/app/models.py` | `VoiceSession` ORM model |
