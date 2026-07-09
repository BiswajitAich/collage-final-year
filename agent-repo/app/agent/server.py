from __future__ import annotations

import json
import logging
import os
from typing import Any

from dotenv import load_dotenv
from livekit.agents import (
    AgentServer,
    AgentSession,
    # AudioConfig,
    # BackgroundAudioPlayer,
    # BuiltinAudioClip,
    JobContext,
    JobProcess,
    cli,
    inference,
)
from livekit.plugins import silero

from app.agent.agent import DefaultAgent
from app.core.registry import ToolRegistry

logger = logging.getLogger("agent-assistant")
load_dotenv(".env")


def _safe_json(value: Any) -> str:
    try:
        return json.dumps(value, ensure_ascii=False, default=str)
    except Exception:
        return str(value)


def _log_conversation_item(item: Any) -> None:
    item_type = getattr(item, "type", None)
    role = getattr(item, "role", None)
    content = getattr(item, "content", None)
    item_id = getattr(item, "id", None)
    logger.info(
        "conversation_item: id=%s type=%s role=%s content=%s",
        item_id,
        item_type,
        role,
        _safe_json(content),
    )

TOOLS_API_URL = os.getenv("TOOLS_API_URL", "http://localhost:8000/agent/tools").strip()
DEFAULT_FAKE_METADATA: dict[str, str] = {}

server = AgentServer()


def prewarm(proc: JobProcess):
    logger.info("Loading Silero VAD model…")
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("Silero VAD model ready")


server.setup_fnc = prewarm


@server.rtc_session(agent_name="assistant")
async def entrypoint(ctx: JobContext):
    tool_registry = await ToolRegistry.load(TOOLS_API_URL)
    logger.info("Tools loaded: %s", [t["name"] for t in tool_registry.list()])
    print(json.dumps(tool_registry.list(), indent=2))

    metadata_json = ctx.job.metadata or json.dumps(DEFAULT_FAKE_METADATA)
    logger.info("Agent job metadata: %s", metadata_json)

    session = AgentSession(
        stt=inference.STT(
            model="assemblyai/universal-streaming-multilingual",
        ),
        llm=inference.LLM(
            model="google/gemini-2.5-flash-lite",
        ),
        tts=inference.TTS(
            model="deepgram/aura-2",
            voice="athena",
        ),
        vad=ctx.proc.userdata["vad"],
        turn_handling={
            "preemptive_generation": {"enabled": True},
        },
    )

    @session.on("conversation_item_added")
    def on_item(event):
        try:
            item = event.item
            _log_conversation_item(item)
            print(type(item))
            print(item)
        except Exception:
            import traceback

            traceback.print_exc()

    @session.on("close")
    def on_close(event):
        logger.info("SESSION CLOSED: %s", _safe_json(getattr(event, "__dict__", str(event))))
        print("SESSION CLOSED")

    @session.on("error")
    def on_error(err):
        logger.exception("Agent session error: %s", err)
        print(err)

    summary = tool_registry.summary()
    logger.info("TOOLS SUMMARY\n%s", summary)
    print("=" * 100)
    print("TOOLS SUMMARY")
    print("=" * 100)
    print(summary)
    print("=" * 100)
    agent = DefaultAgent(
        metadata=metadata_json,
        tool_registry=tool_registry,
    )

    logger.info("Agent instructions prepared")
    await session.start(
        agent=agent,
        room=ctx.room,
    )
    logger.info("Agent session started for room=%s", getattr(ctx.room, "name", None))

    initial_greeting = agent.initial_greeting()
    logger.info("Initial greeting prompt: %s", initial_greeting)
    await session.generate_reply(
        instructions=initial_greeting,
        allow_interruptions=True,
    )

    # logger.info("Agent session started")


if __name__ == "__main__":
    cli.run_app(server)
