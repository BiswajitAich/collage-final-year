// ─── n8n REST API Client ──────────────────────────────────────────────────────
// Handles create, activate, and update operations against a self-hosted n8n.
//
// Required env vars:
//   N8N_BASE_URL  — e.g. https://your-n8n.example.com
//   N8N_API_KEY   — from n8n → Settings → API Keys

import type { N8nWorkflow, N8nCreateWorkflowResponse, N8nDeployResult } from "./n8n-types";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.N8N_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.N8N_API_KEY;

  if (!baseUrl) throw new N8nClientError("N8N_BASE_URL environment variable is not set");
  if (!apiKey) throw new N8nClientError("N8N_API_KEY environment variable is not set");

  return { baseUrl, apiKey };
}

function baseHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-N8N-API-KEY": apiKey,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class N8nClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly body?: string
  ) {
    super(message);
    this.name = "N8nClientError";
  }
}

async function assertOk(res: Response, context: string): Promise<void> {
  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable body)");
    throw new N8nClientError(
      `n8n API ${context} failed [${res.status}]: ${body}`,
      res.status,
      body
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/workflows
 * Creates a new workflow in n8n and returns the server-assigned ID.
 */
export async function createN8nWorkflow(
  workflow: N8nWorkflow
): Promise<N8nCreateWorkflowResponse> {
  console.log('[N8N-CLIENT] createN8nWorkflow called, name:', workflow.name, 'nodes:', workflow.nodes.length);
  const { baseUrl, apiKey } = getConfig();

  const res = await fetch(`${baseUrl}/api/v1/workflows`, {
    method: "POST",
    headers: baseHeaders(apiKey),
    body: JSON.stringify(workflow),
  });

  console.log('[N8N-CLIENT] create response:', res.status, res.statusText);
  await assertOk(res, "createWorkflow");
  const data = await res.json();
  console.log('[N8N-CLIENT] create success, workflow id:', data.id);
  return data as N8nCreateWorkflowResponse;
}

/**
 * PATCH /api/v1/workflows/:id
 * Overwrites an existing workflow (used for re-deploys).
 */
export async function updateN8nWorkflow(
  workflowId: string,
  workflow: N8nWorkflow
): Promise<N8nCreateWorkflowResponse> {
  console.log('[N8N-CLIENT] updateN8nWorkflow called, workflowId:', workflowId, 'name:', workflow.name);
  const { baseUrl, apiKey } = getConfig();

  const res = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
    method: "PATCH",
    headers: baseHeaders(apiKey),
    body: JSON.stringify(workflow),
  });

  console.log('[N8N-CLIENT] update response:', res.status, res.statusText);
  await assertOk(res, "updateWorkflow");
  const data = await res.json();
  console.log('[N8N-CLIENT] update success, workflow id:', data.id);
  return data as N8nCreateWorkflowResponse;
}

/**
 * POST /api/v1/workflows/:id/activate
 * Makes the workflow listen for real requests.
 */
export async function activateN8nWorkflow(workflowId: string): Promise<void> {
  console.log('[N8N-CLIENT] activateN8nWorkflow, id:', workflowId);
  const { baseUrl, apiKey } = getConfig();

  const res = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}/activate`, {
    method: "POST",
    headers: baseHeaders(apiKey),
  });

  console.log('[N8N-CLIENT] activate response:', res.status, res.statusText);
  await assertOk(res, "activateWorkflow");
}

/**
 * POST /api/v1/workflows/:id/deactivate
 */
export async function deactivateN8nWorkflow(workflowId: string): Promise<void> {
  console.log('[N8N-CLIENT] deactivateN8nWorkflow, id:', workflowId);
  const { baseUrl, apiKey } = getConfig();

  const res = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}/deactivate`, {
    method: "POST",
    headers: baseHeaders(apiKey),
  });

  console.log('[N8N-CLIENT] deactivate response:', res.status, res.statusText);
  await assertOk(res, "deactivateWorkflow");
}

/**
 * GET /api/v1/workflows/:id
 * Fetch the current saved state of a workflow.
 */
export async function getN8nWorkflow(workflowId: string): Promise<N8nWorkflow> {
  const { baseUrl, apiKey } = getConfig();

  const res = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
    method: "GET",
    headers: baseHeaders(apiKey),
  });

  await assertOk(res, "getWorkflow");
  return res.json() as Promise<N8nWorkflow>;
}

// ─────────────────────────────────────────────────────────────────────────────
// High-Level: Deploy (create + optionally activate)
// ─────────────────────────────────────────────────────────────────────────────

export interface DeployOptions {
  /** If true, the workflow is activated immediately after creation (default: false) */
  activate?: boolean;
  /**
   * If provided, the existing workflow with this ID is overwritten via PATCH
   * instead of creating a new one with POST.
   */
  existingWorkflowId?: string;
}

/**
 * Full deploy pipeline:
 *   1. Create (or update) the workflow in n8n
 *   2. Optionally activate it
 *   3. Return the workflow URL
 */
export async function deployToN8n(
  workflow: N8nWorkflow,
  options: DeployOptions = {}
): Promise<N8nDeployResult> {
  console.log('[N8N-CLIENT] deployToN8n called, name:', workflow.name, 'options:', JSON.stringify(options));
  const { baseUrl } = getConfig();
  const { activate = false, existingWorkflowId } = options;

  // ── Create or update ───────────────────────────────────────────────────────
  let created: N8nCreateWorkflowResponse;

  if (existingWorkflowId) {
    console.log('[N8N-CLIENT] deployToN8n: updating existing workflow:', existingWorkflowId);
    created = await updateN8nWorkflow(existingWorkflowId, workflow);
  } else {
    console.log('[N8N-CLIENT] deployToN8n: creating new workflow');
    created = await createN8nWorkflow(workflow);
  }

  // ── Activate (optional) ───────────────────────────────────────────────────
  if (activate) {
    console.log('[N8N-CLIENT] deployToN8n: activating workflow:', created.id);
    await activateN8nWorkflow(created.id);
  }

  console.log('[N8N-CLIENT] deployToN8n complete, workflowId:', created.id);
  return {
    workflowId: created.id,
    workflowUrl: `${baseUrl}/workflow/${created.id}`,
    active: activate,
  };
}