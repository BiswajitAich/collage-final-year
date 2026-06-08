import json
import logging
from datetime import timedelta

from livekit import api

from app.config import (
    AGENT_NAME,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    LIVEKIT_SIP_TRUNK_ID,
    LIVEKIT_URL,
    ROOM_EMPTY_TIMEOUT_SEC,
    ROOM_MAX_PARTICIPANTS,
    TOKEN_TTL_SEC,
)

logger = logging.getLogger("livekit_service")


def _client() -> api.LiveKitAPI:
    """Return a LiveKitAPI async-context-manager client."""
    return api.LiveKitAPI(
        url=LIVEKIT_URL,
        api_key=LIVEKIT_API_KEY,
        api_secret=LIVEKIT_API_SECRET,
    )


# ── Room ──────────────────────────────────────────────────────────────────────

async def create_room(room_name: str) -> None:
    """Create a LiveKit room with sane defaults."""
    async with _client() as lk:
        await lk.room.create_room(
            api.CreateRoomRequest(
                name=room_name,
                empty_timeout=ROOM_EMPTY_TIMEOUT_SEC,
                max_participants=ROOM_MAX_PARTICIPANTS,
            )
        )
    logger.info("Room created: %s", room_name)


async def delete_room(room_name: str) -> None:
    """Forcefully close a room (disconnects all participants)."""
    async with _client() as lk:
        await lk.room.delete_room(api.DeleteRoomRequest(room=room_name))
    logger.info("Room deleted: %s", room_name)


# ── Participant token ─────────────────────────────────────────────────────────

async def create_participant_token(
    room_name: str,
    identity: str,
    name: str,
    metadata: dict,
) -> str:
    """
    Mint a signed JWT for a frontend participant.
    Pass the returned token and LIVEKIT_URL directly to the LiveKit JS SDK:

        const room = new Room();
        await room.connect(livekit_url, token);
    """
    token = (
        api.AccessToken(api_key=LIVEKIT_API_KEY, api_secret=LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_name(name)
        .with_metadata(json.dumps(metadata))
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
            )
        )
        .with_ttl(timedelta(seconds=TOKEN_TTL_SEC))
        .to_jwt()
    )
    logger.info("Token minted for identity=%s room=%s", identity, room_name)
    return token


# ── Agent dispatch ────────────────────────────────────────────────────────────

async def dispatch_agent(room_name: str, metadata: dict) -> None:
    """
    Ask the LiveKit agent server to place the named agent into the room.
    The metadata dict is JSON-serialised and passed to JobContext.job.metadata
    inside the agent process — this is how user_id / phone_number reach it.
    """
    async with _client() as lk:
        await lk.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                agent_name=AGENT_NAME,
                room=room_name,
                metadata=json.dumps(metadata),
            )
        )
    logger.info("Agent '%s' dispatched to room=%s", AGENT_NAME, room_name)


# ── SIP outbound call ─────────────────────────────────────────────────────────

async def create_sip_outbound_call(
    room_name: str,
    phone_number: str,   
    participant_name: str,
) -> None:
    if not LIVEKIT_SIP_TRUNK_ID:
        raise RuntimeError(
            "LIVEKIT_SIP_TRUNK_ID is not set. "
            "Create a SIP trunk in the LiveKit Console and add its ID to .env."
        )

    identity = f"sip-{phone_number.lstrip('+')}"

    async with _client() as lk:
        await lk.sip.create_sip_participant(
            api.CreateSIPParticipantRequest(
                sip_trunk_id=LIVEKIT_SIP_TRUNK_ID,
                sip_call_to=phone_number,
                room_name=room_name,
                participant_identity=identity,
                participant_name=participant_name,
                play_ringtone=True,
            )
        )
    logger.info(
        "SIP call initiated to %s (identity=%s) in room=%s",
        phone_number,
        identity,
        room_name,
    )
