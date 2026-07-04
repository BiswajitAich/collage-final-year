import os
import logging
import re
from typing import Any, Optional
import aiohttp
import asyncio
import json
from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    AudioConfig,
    BackgroundAudioPlayer,
    BuiltinAudioClip,
    RunContext,
    ToolError,
    cli,
    function_tool,
    inference,
    utils,
)
from livekit.agents.beta.tools import EndCallTool
from livekit.plugins import silero          # ← VAD: end-of-turn detection

from prompts import agent_prompt, extra_description, end_instructions

logger = logging.getLogger("agent-assistant")
load_dotenv(".env")

TOOLS_API_URL = os.getenv("TOOLS_API_URL", "http://localhost:8000/agent/tools").strip()

DEFAULT_FAKE_METADATA = {
    "user_id": "20000000-0000-0000-0000-000000000001",
    "caller_phone_number": "9999999999",
    "name": "Test User",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def normalize_name(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "_", value).strip("_").lower()


# ── Tool registry ─────────────────────────────────────────────────────────────

class ToolRegistry:
    def __init__(self, tools: list[dict[str, Any]]):
        self.tools = tools
        self._by_key: dict[str, dict[str, Any]] = {}
        for tool in tools:
            self._by_key[normalize_name(tool["name"])] = tool
            self._by_key[str(tool["id"])] = tool

    @classmethod
    async def load(cls, tools_api_url: str) -> "ToolRegistry":
        async with aiohttp.ClientSession() as session:
            async with session.get(
                tools_api_url,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status >= 400:
                    raise RuntimeError(f"Failed to load tools: HTTP {resp.status}")
                data = await resp.json()
        return cls(data.get("tools", []))

    def summary_text(self) -> str:
        if not self.tools:
            return "No tools loaded."
        lines = []
        for i, tool in enumerate(self.tools, start=1):
            lines.append(
                f"{i}. {tool['name']} — "
                f"{tool.get('description') or tool.get('purpose') or 'No description'}"
                f" | method={tool['httpMethod']} | endpoint={tool['endpoint']}"
            )
        return "\n".join(lines)

    def resolve(self, tool_name: str) -> Optional[dict[str, Any]]:
        return self._by_key.get(normalize_name(tool_name)) or self._by_key.get(tool_name)


# ── Variable templater ────────────────────────────────────────────────────────

class VariableTemplater:
    def __init__(self, metadata: str):
        self.variables = {"metadata": self._parse_metadata(metadata)}

    def _parse_metadata(self, metadata: str) -> dict[str, Any]:
        try:
            value = json.loads(metadata)
            if isinstance(value, dict):
                merged = dict(DEFAULT_FAKE_METADATA)
                merged.update(value)
                return merged
            return dict(DEFAULT_FAKE_METADATA)
        except json.JSONDecodeError:
            return dict(DEFAULT_FAKE_METADATA)

    def render(self, template: str, extra: Optional[dict[str, str]] = None) -> str:
        metadata = self.variables["metadata"]
        rendered = template.replace("{{user_id}}", str(metadata.get("user_id", "")))
        rendered = rendered.replace(
            "{{caller_phone_number}}",
            str(metadata.get("caller_phone_number", "")),
        )
        rendered = rendered.replace(
            "{{tools_summary}}",
            extra.get("tools_summary", "") if extra else "",
        )
        return rendered


# ── Agent ─────────────────────────────────────────────────────────────────────

class DefaultAgent(Agent):
    def __init__(self, metadata: str, tool_registry: ToolRegistry) -> None:
        self._templater = VariableTemplater(metadata)
        self._tool_registry = tool_registry
        super().__init__(
            instructions=self._templater.render(
                agent_prompt,
                extra={"tools_summary": tool_registry.summary_text()},
            ),
            tools=[
                EndCallTool(
                    extra_description=extra_description,
                    end_instructions=end_instructions,
                    delete_room=True,
                )
            ],
        )

    async def on_enter(self):
        customer_info = await self._lookup_customer_info()
        if customer_info:
            await self.session.generate_reply(
                instructions=f"Greet the caller naturally. Their info: {customer_info}",
                allow_interruptions=True,
            )
        else:
            await self.session.generate_reply(
                instructions="Greet the caller. Introduce yourself.",
                allow_interruptions=True,
            )

    async def _lookup_customer_info(self) -> str:
        metadata = self._templater.variables["metadata"]
        customer_id = metadata.get("customer_id") or metadata.get("user_id", "")

        tool = self._tool_registry.resolve("customers-details")
        if not tool:
            return ""

        endpoint = str(tool["endpoint"])
        if endpoint.startswith("mock://"):
            return self._mock_tool_response("customers-details", {"customer_id": customer_id})

        try:
            session = utils.http_context.http_session()
            async with session.get(endpoint, params={"customer_id": customer_id}) as resp:
                if resp.status < 400:
                    return await resp.text()
        except Exception:
            pass
        return ""

    @function_tool(name="list_tools")
    async def list_tools(self, context: RunContext) -> str:
        """Return the list of tools the assistant can run."""
        context.disallow_interruptions()
        return self._tool_registry.summary_text()

    @function_tool(name="get_call_info")
    async def get_call_info(self, context: RunContext) -> str:
        """Return who is calling — name, user ID, phone number."""
        context.disallow_interruptions()
        return json.dumps(self._templater.variables["metadata"], indent=2)

    @function_tool(name="run_tool")
    async def run_tool(
        self,
        context: RunContext,
        tool_name: str,
        payload_json: str = "{}",
    ) -> str:
        """Run one of the available tools by name. Pass parameters as JSON."""
        context.disallow_interruptions()

        tool = self._tool_registry.resolve(tool_name)
        if not tool:
            raise ToolError(f"Unknown tool: {tool_name}")

        try:
            payload = json.loads(payload_json or "{}")
            if not isinstance(payload, dict):
                raise ValueError("payload_json must decode to a JSON object")
        except Exception as e:
            raise ToolError(f"Invalid payload_json: {e!s}") from e

        # Auto-inject customer_id from call metadata if the tool needs it
        metadata = self._templater.variables["metadata"]
        if "customer_id" not in payload:
            customer_id = metadata.get("customer_id") or metadata.get("user_id", "")
            if customer_id:
                payload["customer_id"] = customer_id

        endpoint = str(tool["endpoint"])
        method = str(tool["httpMethod"]).upper()

        if endpoint.startswith("mock://"):
            return self._mock_tool_response(tool_name=tool["name"], payload=payload)

        try:
            session = utils.http_context.http_session()
            timeout = aiohttp.ClientTimeout(total=10)

            if method == "GET":
                async with session.get(endpoint, timeout=timeout, params=payload) as resp:
                    if resp.status >= 400:
                        raise ToolError(f"error: HTTP {resp.status}")
                    return await resp.text()

            async with session.request(method, endpoint, timeout=timeout, json=payload) as resp:
                if resp.status >= 400:
                    raise ToolError(f"error: HTTP {resp.status}")
                return await resp.text()

        except ToolError:
            raise
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            raise ToolError(f"error: {e!s}") from e

    def _mock_tool_response(self, tool_name: str, payload: dict[str, Any]) -> str:
        metadata = self._templater.variables["metadata"]
        if normalize_name(tool_name) in {"get_customer_status", "customers_status"}:
            return json.dumps({
                "customer_id": payload.get("customer_id", metadata["user_id"]),
                "status": "ACTIVE",
                "tier": "PREMIUM",
                "orders_count": 12,
            }, indent=2)
        if normalize_name(tool_name) in {"get_customer_by_id", "customers_details"}:
            return json.dumps({
                "customer_id": payload.get("customer_id", metadata["user_id"]),
                "name": metadata.get("name", "Test User"),
                "phone_number": metadata.get("caller_phone_number", "9999999999"),
                "email": "test@example.com",
                "status": "ACTIVE",
            }, indent=2)
        return json.dumps({"ok": True, "tool": tool_name, "payload": payload}, indent=2)


# ── Server setup ──────────────────────────────────────────────────────────────

server = AgentServer()


def prewarm(proc: JobProcess):
    logger.info("Loading Silero VAD model…")
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("Silero VAD model ready")


server.setup_fnc = prewarm


@server.rtc_session(agent_name="assistant")
async def entrypoint(ctx: JobContext):
    tool_registry = await ToolRegistry.load(TOOLS_API_URL)
    logger.info("Tools loaded: %s", [t["name"] for t in tool_registry.tools])

    metadata_json = ctx.job.metadata or json.dumps(DEFAULT_FAKE_METADATA)

    session = AgentSession(
        stt=inference.STT(
            model="assemblyai/universal-streaming-multilingual",
            # language="en-IN",
        ),
        llm=inference.LLM(
            model="google/gemini-2.5-flash-lite",
        ),
        tts=inference.TTS(
            model="deepgram/aura-2",
            voice="athena",
            # language="en-US",
        ),
        vad=ctx.proc.userdata["vad"],
        turn_handling={
            "preemptive_generation": {"enabled": True},
        },
    )

    await session.start(
        agent=DefaultAgent(metadata=metadata_json, tool_registry=tool_registry),
        room=ctx.room,
    )
    logger.info("Agent session started")

    # background_audio = BackgroundAudioPlayer(
    #     ambient_sound=AudioConfig(BuiltinAudioClip.OFFICE_AMBIENCE, volume=0.3),
    # )
    # await background_audio.start(room=ctx.room, agent_session=session)


if __name__ == "__main__":
    cli.run_app(server)