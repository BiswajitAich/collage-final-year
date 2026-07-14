from __future__ import annotations

import json
import logging
import os

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

            print(type(item))
            print(item)

        except Exception:
            import traceback

            traceback.print_exc()

    @session.on("close")
    def on_close(event):
        print("SESSION CLOSED")

    @session.on("error")
    def on_error(err):
        print(err)

    summary = tool_registry.summary()
    print("=" * 100)
    print("TOOLS SUMMARY")
    print("=" * 100)
    print(summary)
    print("=" * 100)
    agent = DefaultAgent(
        metadata=metadata_json,
        tool_registry=tool_registry,
    )

    await session.start(
        agent=agent,
        room=ctx.room,
    )

    await session.generate_reply(
        instructions=agent.initial_greeting(),
        allow_interruptions=True,
    )

    # logger.info("Agent session started")


if __name__ == "__main__":
    cli.run_app(server)
