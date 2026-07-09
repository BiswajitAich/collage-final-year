from __future__ import annotations

import json
import logging
from time import perf_counter
from typing import Any
from urllib.parse import urlencode

import aiohttp
from livekit.agents import ToolError, utils
from sqlalchemy import text

from app.database import SessionLocal

logger = logging.getLogger("tool_executor")


def _parse_payload(payload: dict[str, Any] | str) -> dict[str, Any]:
    if isinstance(payload, dict):
        return payload
    try:
        parsed = json.loads(payload or "{}")
    except json.JSONDecodeError as exc:
        raise ToolError("Invalid JSON payload.") from exc
    if not isinstance(parsed, dict):
        raise ToolError("Invalid JSON payload.")
    return parsed


def _request_headers(payload: dict[str, Any]) -> dict[str, str]:
    headers = {
        "Accept": "application/json, text/plain;q=0.9, */*;q=0.8",
    }

    header_mappings = {
        "userId": "X-User-Id",
        "user_id": "X-User-Id",
        "customerId": "X-Customer-Id",
        "customer_id": "X-Customer-Id",
        "phoneNumber": "X-Phone-Number",
        "phone_number": "X-Phone-Number",
        "caller_phone_number": "X-Phone-Number",
        "name": "X-User-Name",
    }

    for key, header_name in header_mappings.items():
        value = payload.get(key)
        if value is None:
            continue
        text_value = str(value).strip()
        if text_value and header_name not in headers:
            headers[header_name] = text_value

    return headers


def _request_url(url: str, method: str, payload: dict[str, Any]) -> str:
    if method != "GET" or not payload:
        return url

    query = urlencode(
        [(key, str(value)) for key, value in payload.items() if value is not None],
        doseq=True,
    )
    if not query:
        return url
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}{query}"


def _normalize_response_body(
    *,
    tool_name: str,
    method: str,
    url: str,
    status: int,
    body: str,
) -> str:
    stripped = body.strip()
    if not stripped:
        raise ToolError(
            f"Workflow '{tool_name}' returned HTTP {status} with an empty body. "
            f"Check that the n8n webhook '{method} {url}' reaches a Respond to Webhook/response node and returns JSON or text."
        )

    try:
        parsed = json.loads(stripped)
    except json.JSONDecodeError:
        return stripped

    if isinstance(parsed, str):
        parsed_text = parsed.strip()
        if not parsed_text:
            raise ToolError(
                f"Workflow '{tool_name}' returned an empty string response."
            )
        return parsed_text

    return json.dumps(parsed, indent=2, ensure_ascii=False)


def _mock_tool_response(tool_name: str, payload: dict[str, Any]) -> str:
    if tool_name in {"get_customer_status", "customers_status"}:
        return json.dumps(
            {
                "customer_id": payload.get("customer_id", ""),
                "status": "ACTIVE",
                "tier": "PREMIUM",
                "orders_count": 12,
            },
            indent=2,
        )
    if tool_name in {"get_customer_by_id", "customers_details", "get_user_profile", "customer_profile", "get_customer_profile"}:
        return json.dumps(
            {
                "customer_id": payload.get("customer_id", ""),
                "name": payload.get("name", "Test User"),
                "phone_number": payload.get("phone_number", "9999999999"),
                "email": "test@example.com",
                "status": "ACTIVE",
            },
            indent=2,
        )
    return json.dumps({"ok": True, "tool": tool_name, "payload": payload}, indent=2)


async def _update_workflow_metrics(
    tool: dict[str, Any], latency_ms: int, success: bool
) -> None:
    workflow_id = tool.get("id")
    if not workflow_id:
        return

    async with SessionLocal() as db:
        result = await db.execute(
            text(
                'SELECT "executionCount", "successRate", "avgLatencyMs" '
                'FROM "Workflow" WHERE id = :workflow_id'
            ),
            {"workflow_id": workflow_id},
        )
        row = result.mappings().one_or_none()
        if not row:
            return

        previous_count = int(row["executionCount"] or 0)
        previous_success_rate = float(row["successRate"] or 0.0)
        previous_latency = int(row["avgLatencyMs"] or 0)
        next_count = previous_count + 1
        next_latency = round(
            ((previous_latency * previous_count) + latency_ms) / next_count
        )
        next_success = round(
            ((previous_success_rate * previous_count) + (100.0 if success else 0.0))
            / next_count,
            2,
        )

        await db.execute(
            text(
                'UPDATE "Workflow" SET '
                '"executionCount" = :execution_count, '
                '"successRate" = :success_rate, '
                '"avgLatencyMs" = :avg_latency_ms '
                "WHERE id = :workflow_id"
            ),
            {
                "workflow_id": workflow_id,
                "execution_count": next_count,
                "success_rate": next_success,
                "avg_latency_ms": next_latency,
            },
        )
        await db.commit()


async def _increment_voice_session_tool_count(session_id: str) -> None:
    async with SessionLocal() as db:
        await db.execute(
            text(
                'UPDATE "VoiceSession" '
                'SET "toolCallCount" = "toolCallCount" + 1 '
                "WHERE id = :session_id"
            ),
            {"session_id": session_id},
        )
        await db.commit()


async def execute_db_tool(
    tool: dict[str, Any],
    payload: dict[str, Any] | str = "{}",
    *,
    session_id: str | None = None,
) -> str:
    started_at = perf_counter()
    payload_dict: dict[str, Any] | None = None
    success = False
    should_record_workflow = False

    try:
        payload_dict = _parse_payload(payload)
        url = str(tool.get("url") or tool.get("n8nWebhookUrl") or "")
        method = str(tool.get("httpMethod") or "GET").upper()
        should_record_workflow = bool(tool.get("id"))

        if not url:
            raise ToolError("Tool URL missing.")

        if url.startswith("mock://"):
            success = True
            return _mock_tool_response(str(tool.get("name") or "tool"), payload_dict)

        tool_name = str(tool.get("name") or "tool")
        session = utils.http_context.http_session()
        timeout = aiohttp.ClientTimeout(total=10)
        headers = _request_headers(payload_dict)

        if method == "GET":
            request_url = _request_url(url, method, payload_dict)
            async with session.get(request_url, headers=headers, timeout=timeout) as resp:
                response_text = await resp.text()
                if resp.status >= 400:
                    raise ToolError(f"HTTP {resp.status}: {response_text}")
                normalized = _normalize_response_body(
                    tool_name=tool_name,
                    method=method,
                    url=request_url,
                    status=resp.status,
                    body=response_text,
                )
                success = True
                return normalized

        async with session.request(
            method,
            url,
            json=payload_dict,
            headers=headers,
            timeout=timeout,
        ) as resp:
            response_text = await resp.text()
            if resp.status >= 400:
                raise ToolError(f"HTTP {resp.status}: {response_text}")
            normalized = _normalize_response_body(
                tool_name=tool_name,
                method=method,
                url=url,
                status=resp.status,
                body=response_text,
            )
            success = True
            return normalized
    finally:
        latency_ms = max(0, int((perf_counter() - started_at) * 1000))
        if session_id:
            try:
                await _increment_voice_session_tool_count(session_id)
            except Exception:
                logger.exception("Failed to increment VoiceSession.toolCallCount")
        if should_record_workflow and payload_dict is not None:
            try:
                await _update_workflow_metrics(tool, latency_ms, success)
            except Exception:
                logger.exception("Failed to update Workflow metrics")
