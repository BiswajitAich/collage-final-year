from __future__ import annotations

# import asyncio
import json
import logging
import random
from typing import Any

from livekit.agents import Agent, RunContext, ToolError, function_tool
from livekit.agents.beta.tools import EndCallTool

from app.agent.prompts import agent_prompt, end_instructions, extra_description
from app.agent.templater import VariableTemplater
from app.core.executor import execute_db_tool
from app.core.registry import ToolRegistry
# from app.services import livekit_service

logger = logging.getLogger("agent-assistant")

_FILLER_PHRASES = [
    "One second.",
    "Let me check that.",
    "Please wait a moment.",
    "Let me look that up.",
]


class DefaultAgent(Agent):
    def __init__(self, metadata: str, tool_registry: ToolRegistry) -> None:
        self._templater = VariableTemplater(metadata)
        self._tool_registry = tool_registry
        self._session_id = (
            str(self._templater.variables["metadata"].get("session_id") or "") or None
        )
        self._room_name = (
            str(self._templater.variables["metadata"].get("room_name") or "") or None
        )
        self._ending_call = False
        instructions = self._templater.render(
            agent_prompt,
            extra={
                "tools_summary": tool_registry.summary(),
            },
        )
        print("=" * 100)
        print("SYSTEM PROMPT")
        print("=" * 100)
        print(instructions)
        print("=" * 100)
        print(tool_registry.list)
        print("=" * 100)

        super().__init__(
            instructions=instructions,
            tools=[
                EndCallTool(
                    extra_description=extra_description,
                    end_instructions=end_instructions,
                    delete_room=True,
                ),
            ],
        )

    def initial_greeting(self) -> str:
        return self._templater.render(
            "Greet {{user_name}} by name only. Do NOT read out, spell, or mention the "
            "customer ID, user ID, or any other internal identifier out loud — those "
            "are for internal use only, never speak them to the caller. Do NOT ask "
            "for any personal information — the form already provided everything. "
            "Ask how you can help."
        )

    def _known_user_context(self) -> dict[str, Any]:
        metadata = self._templater.variables["metadata"]
        user_id = metadata.get("user_id")
        customer_id = metadata.get("customer_id")
        phone_number = metadata.get("caller_phone_number")
        name = metadata.get("name")
        return {
            "userId": user_id,
            "user_id": user_id,
            "customerId": customer_id,
            "customer_id": customer_id,
            "phoneNumber": phone_number,
            "phone_number": phone_number,
            "caller_phone_number": phone_number,
            "name": name,
        }

    # async def _delete_room_after_delay(self, delay_seconds: float = 1.5) -> None:
    #     if not self._room_name:
    #         return
    #     await asyncio.sleep(delay_seconds)
    #     await livekit_service.delete_room(self._room_name)

    # async def _end_call_impl(self) -> str:
    #     if self._ending_call:
    #         return "Goodbye!"
    #     if not self._room_name:
    #         raise ToolError("Room name missing; cannot end the call.")

    #     self._ending_call = True
    #     asyncio.create_task(self._delete_room_after_delay())
    #     return "Goodbye!"

    # @function_tool(
    #     name="end_call",
    #     description="End the current call when the user asks to stop, hang up, or say goodbye.",
    # )
    # async def end_call(self, context: RunContext) -> str:
    #     context.disallow_interruptions()
    #     return await self._end_call_impl()

    @function_tool(
        name="execute_workflow",
        description=(
            "Execute one of the available workflows. "
            "workflow_name must exactly match one of the available tools. "
            "arguments_json must be a JSON object containing all required parameters. "
            "Never use this tool to end the call."
        ),
    )
    async def execute_workflow(
        self,
        context: RunContext,
        workflow_name: str,
        arguments_json: str,
    ) -> str:
        context.disallow_interruptions()

        # normalized_workflow = workflow_name.strip().lower().replace("-", "_")
        logger.info(
            "execute_workflow called: workflow_name=%s arguments_json=%s",
            workflow_name,
            arguments_json,
        )
        # if normalized_workflow in {"end_call", "endcall", "hangup", "hang_up", "stop_call", "bye", "goodbye"}:
        #     return await self._end_call_impl()

        tool = self._tool_registry.get_tool(workflow_name)

        if tool is None:
            raise ToolError(f"Unknown workflow '{workflow_name}'")

        try:
            args = json.loads(arguments_json or "{}")
            if not isinstance(args, dict):
                args = {}
        except json.JSONDecodeError:
            args = {}

        # Always make sure the workflow has access to the caller's known
        # identity, even if the LLM didn't think to include it — most
        # workflows key off user_id/customer_id to look up the right record.
        for key, value in self._known_user_context().items():
            if value and key not in args:
                args[key] = value

        logger.info(
            "execute_workflow resolved tool=%s url=%s method=%s args=%s",
            tool.get("name"),
            tool.get("url") or tool.get("n8nWebhookUrl"),
            tool.get("httpMethod"),
            json.dumps(args, ensure_ascii=False),
        )
        context.session.say(random.choice(_FILLER_PHRASES))

        result = await execute_db_tool(
            tool,
            args,
            session_id=self._session_id,
        )
        print("=" * 80)
        print("Result:")
        print("=" * 80)
        print(result)
        print("=" * 80)
        logger.info("execute_workflow completed: workflow_name=%s result=%s", workflow_name, result)

        return result
