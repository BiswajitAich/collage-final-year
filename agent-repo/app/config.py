import os
from dotenv import load_dotenv

load_dotenv(".env")


def _require(key: str) -> str:
    val = os.getenv(key, "").strip()
    if not val:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return val


DATABASE_URL: str = _require("DATABASE_URL")

LIVEKIT_URL: str = _require("LIVEKIT_URL")
LIVEKIT_API_KEY: str = _require("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET: str = _require("LIVEKIT_API_SECRET")

LIVEKIT_SIP_TRUNK_ID: str = os.getenv("LIVEKIT_SIP_TRUNK_ID", "").strip()

AGENT_NAME: str = os.getenv("AGENT_NAME", "assistant").strip()

FRONTEND_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv("FRONTEND_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

TOOLS_API_URL: str = os.getenv(
    "TOOLS_API_URL", "http://localhost:8000/agent/tools"
).strip()
USE_MOCK_TOOLS: bool = os.getenv("USE_MOCK_TOOLS", "false").lower() == "true"

ROOM_EMPTY_TIMEOUT_SEC: int = int(os.getenv("ROOM_EMPTY_TIMEOUT_SEC", "300"))
ROOM_MAX_PARTICIPANTS: int = int(os.getenv("ROOM_MAX_PARTICIPANTS", "10"))
TOKEN_TTL_SEC: int = int(os.getenv("TOKEN_TTL_SEC", "3600"))
