from __future__ import annotations

import json
from typing import Any

from livekit.agents import Agent, RunContext, ToolError, function_tool
from livekit.agents.beta.tools import EndCallTool

from app.agent.prompts import agent_prompt, end_instructions, extra_description
from app.agent.templater import VariableTemplater
from app.core.executor import execute_db_tool
from app.core.registry import ToolRegistry

class DefaultAgent(Agent):
    def __init__(self, metadata: str, tool_registry: ToolRegistry) -> None:
        self._templater = VariableTemplater(metadata)
        self._tool_registry = tool_registry
        self._session_id = (
            str(self._templater.variables["metadata"].get("session_id") or "") or None
        )
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

        end_call_tool = EndCallTool(
            extra_description=extra_description,
            end_instructions=end_instructions,
            delete_room=True,
        )

        super().__init__(
            instructions=instructions,
            tools=[
                *end_call_tool.tools,
                # self.get_user_information,
                # self.list_available_tools,
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

    @function_tool(
        name="execute_workflow",
        description=(
            "Execute one of the available workflows. "
            "workflow_name must exactly match one of the available tools. "
            "arguments_json must be a JSON object containing all required parameters. "
            "For caller-specific requests, include the known customer_id by default and include user_id when relevant. "
            "Do not ask the caller to provide IDs that are already known internally."
        ),
    )
    async def execute_workflow(
        self,
        context: RunContext,
        workflow_name: str,
        arguments_json: str,
    ) -> str:
        context.disallow_interruptions()

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

        return result

    # @function_tool(name="list_available_tools")
    # async def list_available_tools(self, context: RunContext) -> str:
    #     context.disallow_interruptions()
    #     return self._tool_registry.summary()

    # @function_tool(
    #     name="get_user_information",
    #     description="Get the current caller's information including name, phone number, user ID, and customer ID."
    # )
    # async def get_user_information(self, context: RunContext) -> str:
    #     context.disallow_interruptions()
    #     return json.dumps(self._templater.variables["metadata"], indent=2)
