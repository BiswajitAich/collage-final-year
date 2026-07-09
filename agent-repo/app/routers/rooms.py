import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import LIVEKIT_URL
from app.database import get_db
from app.schemas import (
    CreateRoomRequest,
    CreateRoomResponse,
    EndSessionRequest,
    OutboundCallRequest,
    OutboundCallResponse,
    SessionStatusResponse,
)
from app.services import livekit_service, session_service

logger = logging.getLogger("rooms")
router = APIRouter(prefix="/rooms", tags=["rooms"])


# ── POST /rooms/create ────────────────────────────────────────────────────────

@router.post("/create", response_model=CreateRoomResponse)
async def create_room(
    req: CreateRoomRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a LiveKit room, dispatch the AI agent, and return a participant token.
    """
    operator_id = req.admin_id or req.customer_id
    room_name = f"room-{req.customer_id[:12]}-{uuid.uuid4().hex[:8]}"
    session = None

    try:
        try:
            session = await session_service.create_session(
                db=db,
                user_id=operator_id,
                customer_id=req.customer_id,
                room_name=room_name,
                phone_number=req.phone_number,
                name=req.name,
            )
        except IntegrityError as exc:
            await db.rollback()
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid customer_id '{req.customer_id}'"
                    if not req.admin_id
                    else f"Invalid admin_id/customer_id combination for '{req.customer_id}'"
                ),
            ) from exc

        metadata = {
            "session_id": session.id,
            "admin_id": req.admin_id or "",
            "user_id": req.customer_id,
            "customer_id": req.customer_id,
            "caller_phone_number": req.phone_number or req.customer_id or "",
            "name": req.name or "User",
        }
        await livekit_service.create_room(room_name)
        token = await livekit_service.create_participant_token(
            room_name=room_name,
            identity=operator_id,
            name=req.name or "User",
            metadata=metadata,
        )
        await livekit_service.dispatch_agent(room_name=room_name, metadata=metadata)

    except HTTPException:
        raise
    except Exception as exc:
        if session is not None:
            await session_service.fail_sessions_for_room(db, room_name)
        logger.exception(
            "Failed to create room for customer=%s operator=%s",
            req.customer_id,
            operator_id,
        )
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return CreateRoomResponse(
        session_id=str(session.id),
        room_name=room_name,
        token=token,
        livekit_url=LIVEKIT_URL,
    )


# ── POST /rooms/outbound-call ─────────────────────────────────────────────────

@router.post("/outbound-call", response_model=OutboundCallResponse)
async def initiate_outbound_call(
    req: OutboundCallRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Dial a phone number and bridge it into the existing room as a SIP participant.
    The AI agent (already in the room) handles the call.
    """
    session = await session_service.get_session(db, req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.roomName is None:
        raise HTTPException(status_code=400, detail="Session has no associated room")
    if session.status in ("ENDED", "FAILED"):
        raise HTTPException(status_code=400, detail=f"Session is {session.status}")

    try:
        await livekit_service.create_sip_outbound_call(
            room_name=session.roomName or "",
            phone_number=req.phone_number,
            participant_name=req.name or req.phone_number,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("SIP call failed to %s", req.phone_number)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return OutboundCallResponse(
        ok=True,
        message=f"Call initiated to {req.phone_number}",
        participant_identity=f"sip-{req.phone_number.lstrip('+')}",
    )


# ── POST /rooms/end ───────────────────────────────────────────────────────────

@router.post("/end")
async def end_session(
    req: EndSessionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a session as ENDED and compute duration.
    Call this when the user clicks "End Call" in the UI.
    The LiveKit webhook also handles this automatically on room_finished.
    """
    try:
        session = await session_service.end_session(
            db=db,
            session_id=req.session_id,
            message_count=req.message_count,
            tool_call_count=req.tool_call_count,
            success_rate=req.success_rate,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return {
        "ok": True,
        "session_id": session.id,
        "status": session.status,
        "duration_sec": session.durationSec,
    }


# ── GET /rooms/{session_id}/status ────────────────────────────────────────────

@router.get("/{session_id}/status", response_model=SessionStatusResponse)
async def get_session_status(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Poll session status.  Use this to show call duration / stats in the UI
    after a session ends.
    """
    session = await session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionStatusResponse(
        session_id=session.id,
        status=session.status,
        room_name=session.roomName,
        phone_number=session.phoneNumber,
        start_time=session.startTime.isoformat() if session.startTime else None,
        end_time=session.endTime.isoformat() if session.endTime else None,
        duration_sec=session.durationSec,
        message_count=session.messageCount,
        tool_call_count=session.toolCallCount,
        success_rate=session.successRate,
    )
