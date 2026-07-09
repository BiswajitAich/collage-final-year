import logging
import re
from typing import Any, Optional
from urllib.parse import urlsplit, urlunsplit
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text
from app.config import APP_DATABASE_URL, DATABASE_URL, USE_MOCK_TOOLS
from app.database import AppSessionLocal

logger = logging.getLogger("agent")

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
    # {
    #     "id": "mock-3",
    #     "name": "get_user_profile",
    #     "description": "Get the current customer's profile details.",
    #     "purpose": "Retrieve the caller's profile details such as name, phone, email, and account status.",
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
    if AppSessionLocal is None:
        logger.warning("Workflow DB session is not configured")
        return []

    db_source = "APP_DATABASE_URL" if APP_DATABASE_URL and APP_DATABASE_URL != DATABASE_URL else "DATABASE_URL"

    try:
        async with AppSessionLocal() as session:
            result = await session.execute(
                text(
                    """
                    SELECT
                        id,
                        name,
                        description,
                        purpose,
                        "httpMethod",
                        COALESCE(NULLIF("n8nWebhookUrl", ''), NULLIF(endpoint, '')) AS url,
                        "n8nWebhookUrl",
                        status,
                        "toolSchema"
                    FROM "Workflow"
                    WHERE status = 'ACTIVE'
                      AND COALESCE(NULLIF("n8nWebhookUrl", ''), NULLIF(endpoint, '')) IS NOT NULL
                    ORDER BY "createdAt" DESC
                    """
                )
            )
            rows = result.mappings().all()
    except Exception:
        logger.exception("Failed to load workflow tools from %s", db_source)
        return []

    logger.info("Loaded %s active workflow tools from %s", len(rows), db_source)

    return [
        WorkflowTool(
            id=str(row["id"]),
            name=row["name"],
            description=row["description"],
            purpose=row["purpose"],
            httpMethod=row["httpMethod"],
            url=str(_normalize_webhook_url(row["url"]) or ""),
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
    logger.info("Returning %s tools from /agent/tools", len(tools))
    return ToolRegistryResponse(count=len(tools), tools=tools)


@router.post("/tools/reload", response_model=ToolRegistryResponse)
async def reload_tools():
    """Force-refresh the tool list (re-queries DB)."""
    tools = await _get_tools()
    return ToolRegistryResponse(count=len(tools), tools=tools)
