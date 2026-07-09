import re
from typing import Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator


# ── /rooms/create ─────────────────────────────────────────────────────────────

class CreateRoomRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    admin_id: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("admin_id", "adminId", "user_id", "userId"),
    )
    customer_id: str
    name: Optional[str] = None
    phone_number: Optional[str] = None

    @field_validator("admin_id")
    @classmethod
    def admin_id_strip(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        value = v.strip()
        return value or None

    @field_validator("customer_id")
    @classmethod
    def customer_id_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("customer_id must not be empty")
        return v.strip()


class CreateRoomResponse(BaseModel):
    session_id: str
    room_name: str
    token: str          
    livekit_url: str    


# ── /rooms/outbound-call ──────────────────────────────────────────────────────

class OutboundCallRequest(BaseModel):
    session_id: str
    phone_number: str           
    name: Optional[str] = None  

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"[^\d+]", "", v)
        if len(cleaned) < 7:
            raise ValueError("phone_number looks too short")
        if not cleaned.startswith("+"):
            cleaned = f"+{cleaned}"
        return cleaned


class OutboundCallResponse(BaseModel):
    ok: bool
    message: str
    participant_identity: str


# ── /rooms/end ────────────────────────────────────────────────────────────────

class EndSessionRequest(BaseModel):
    session_id: str
    message_count: Optional[int] = None
    tool_call_count: Optional[int] = None
    success_rate: Optional[float] = None  # 0.0 – 1.0


# ── /rooms/{session_id}/status ────────────────────────────────────────────────

class SessionStatusResponse(BaseModel):
    session_id: str
    status: str
    room_name: Optional[str]
    phone_number: Optional[str]
    start_time: Optional[str]
    end_time: Optional[str]
    duration_sec: Optional[int]
    message_count: int
    tool_call_count: int
    success_rate: float
