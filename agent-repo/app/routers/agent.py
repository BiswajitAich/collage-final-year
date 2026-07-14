import re
from typing import Any, Optional
from urllib.parse import urlsplit, urlunsplit
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text
from app.config import USE_MOCK_TOOLS
from app.database import SessionLocal

router = APIRouter(prefix="/agent", tags=["agent"])


# ── Mock tools (dev / testing) ────────────────────────────────────────────────

MOCK_TOOLS: list[dict[str, Any]] = [
    # {
    #     "id": "mock-1",
    #     "name": "customers-status",
    #     "description": "Get customer status details.",
    #     "purpose": "Get customer status details.",
    #     "httpMethod": "GET",
    #     "url": "http://localhost:5678/webhook/users/customer-status",
    #     "n8nWebhookUrl": "http://localhost:5678/webhook/users/customer-status",
    #     "status": "ACTIVE",
    #     "toolSchema": {
    #         "type": "object",
    #         "properties": {
    #             "customer_id": {
    #                 "type": "string",
    #                 "description": "Customer ID",
    #             }
    #         },
    #         "required": ["customer_id"],
    #     },
    # },
    # {
    #     "id": "mock-2",
    #     "name": "customers-details",
    #     "description": "Get detailed information about a customer.",
    #     "purpose": "Get detailed information about a customer.",
    #     "httpMethod": "GET",
    #     "url": "http://localhost:5678/webhook/frontend-test-4",
    #     "n8nWebhookUrl": "http://localhost:5678/webhook/frontend-test-4",
    #     "status": "ACTIVE",
    #     "toolSchema": {
    #         "type": "object",
    #         "properties": {
    #             "customer_id": {
    #                 "type": "string",
    #                 "description": "Customer ID",
    #             }
    #         },
    #         "required": ["customer_id"],
    #     },
    # },
]


class WorkflowTool(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    purpose: Optional[str] = None
    httpMethod: str
    url: str
    n8nWebhookUrl: Optional[str] = None
    status: Optional[str] = None
    toolSchema: Optional[dict[str, Any]] = None


class ToolRegistryResponse(BaseModel):
    count: int
    tools: list[WorkflowTool]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _normalize_webhook_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return url
    parts = urlsplit(url)
    cleaned_path = re.sub(r"/{2,}", "/", parts.path)
    return urlunsplit(
        (parts.scheme, parts.netloc, cleaned_path, parts.query, parts.fragment)
    )


async def _fetch_from_db() -> list[WorkflowTool]:
    async with SessionLocal() as session:
        result = await session.execute(
            text(
                """
                SELECT
                    id,
                    name,
                    description,
                    purpose,
                    "httpMethod",
                                        COALESCE("n8nWebhookUrl", endpoint) AS url,
                                        "n8nWebhookUrl",
                                        status,
                                        "toolSchema"
                FROM "Workflow"
                WHERE status = 'ACTIVE'
                  AND COALESCE("n8nWebhookUrl", endpoint) IS NOT NULL
                ORDER BY "createdAt" DESC
                """
            )
        )
        rows = result.mappings().all()

    return [
        WorkflowTool(
            id=str(row["id"]),
            name=row["name"],
            description=row["description"],
            purpose=row["purpose"],
            httpMethod=row["httpMethod"],
            url=_normalize_webhook_url(row["url"]) or "",
            n8nWebhookUrl=row["n8nWebhookUrl"],
            status=row["status"],
            toolSchema=row["toolSchema"],
        )
        for row in rows
    ]


async def _get_tools() -> list[WorkflowTool]:
    if USE_MOCK_TOOLS:
        return [WorkflowTool(**t) for t in MOCK_TOOLS]
    return await _fetch_from_db()


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/tools", response_model=ToolRegistryResponse)
async def get_agent_tools():
    """Return all active workflow tools. Consumed by the agent's ToolRegistry."""
    tools = await _get_tools()
    return ToolRegistryResponse(count=len(tools), tools=tools)


@router.post("/tools/reload", response_model=ToolRegistryResponse)
async def reload_tools():
    """Force-refresh the tool list (re-queries DB)."""
    tools = await _get_tools()
    return ToolRegistryResponse(count=len(tools), tools=tools)
