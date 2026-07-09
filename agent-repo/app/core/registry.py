from __future__ import annotations

import json
import re
from typing import Any, Awaitable, Callable, Optional

import aiohttp
from livekit.agents import ToolError


def normalize_name(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "_", value).strip("_").lower()


def _as_object(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        if isinstance(parsed, dict):
            return parsed
    return {}


def _tool_url(tool: dict[str, Any]) -> str:
    return str(
        tool.get("url") or tool.get("n8nWebhookUrl") or tool.get("endpoint") or ""
    )


def _tool_schema(tool: dict[str, Any]) -> dict[str, Any]:
    return _as_object(tool.get("toolSchema"))


def _schema_arguments(tool: dict[str, Any]) -> list[str]:
    schema = _tool_schema(tool)
    properties = schema.get("properties")
    if not isinstance(properties, dict):
        return []
    return [str(name) for name in properties.keys()]


class ToolRegistry:
    def __init__(self, tools: list[dict[str, Any]]):
        print("Received tools:", len(tools))
        self._tools: list[dict[str, Any]] = []
        self._by_key: dict[str, dict[str, Any]] = {}

        for tool in tools:
            normalized = dict(tool)
            normalized["url"] = _tool_url(normalized)
            normalized.pop("endpoint", None)
            self._tools.append(normalized)

            name = str(normalized.get("name") or "")
            if name:
                self._by_key[normalize_name(name)] = normalized
                self._by_key[name] = normalized

            tool_id = normalized.get("id")
            if tool_id is not None:
                self._by_key[str(tool_id)] = normalized

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

    def list(self) -> list[dict[str, Any]]:
        return [
            {
                "name": tool.get("name"),
                "description": tool.get("description")
                or tool.get("purpose")
                or "No description",
                "purpose": tool.get("purpose"),
                "httpMethod": tool.get("httpMethod"),
                "url": tool.get("url"),
                "status": tool.get("status"),
                "toolSchema": tool.get("toolSchema"),
            }
            for tool in self._tools
        ]

    def get_tool(self, tool_name: str) -> Optional[dict[str, Any]]:
        return self._by_key.get(normalize_name(tool_name)) or self._by_key.get(
            tool_name
        )

    def summary(self) -> str:
        if not self._tools:
            return "No workflows available."

        lines: list[str] = []
        for index, tool in enumerate(self.list(), start=1):
            schema = tool.get("toolSchema") or {}

            props = schema.get("properties", {})
            required = schema.get("required", [])

            args = []

            for name, value in props.items():
                t = value.get("type", "any")
                req = "required" if name in required else "optional"
                args.append(f"{name}:{t} ({req})")

            lines.append(
                "\n".join(
                    [
                        f"Workflow: {tool['name']}",
                        f"Description: {tool['description']}",
                        f"Arguments: {', '.join(args) if args else 'None'}",
                    ]
                )
            )

        print("agent-repo/app/core/registry.py", "\n\n".join(lines))
        return "\n\n".join(lines)

    async def execute(
        self,
        tool_name: str,
        payload: dict[str, Any] | str,
        executor: Callable[[dict[str, Any], dict[str, Any] | str], Awaitable[str]],
    ) -> str:
        tool = self.get_tool(tool_name)
        if not tool:
            raise ToolError(f"Unknown tool: {tool_name}")
        return await executor(tool, payload)
