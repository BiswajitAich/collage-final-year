// ─── n8n Workflow JSON Types ──────────────────────────────────────────────────
// Matches the shape n8n expects when importing via its REST API.

// ── Connection graph ──────────────────────────────────────────────────────────

export interface N8nConnectionTarget {
  /** Name (label) of the target node — n8n uses labels, not IDs */
  node: string;
  type: "main";
  /** Input port index on the target node (almost always 0) */
  index: number;
}

/**
 * Outer array  → output ports   (port 0 = true/main, port 1 = false/else)
 * Inner array  → multiple targets from the same port
 */
export type N8nConnectionPorts = N8nConnectionTarget[][];

export type N8nConnections = Record<
  string, // source node label
  { main: N8nConnectionPorts }
>;

// ── Node shapes ───────────────────────────────────────────────────────────────

export interface N8nNodeCredential {
  id: string;
  name: string;
}

export interface N8nNode {
  /** UUID generated at compile time */
  id: string;
  /** Human-readable name — used as the connection graph key */
  name: string;
  /** n8n node type string, e.g. "n8n-nodes-base.webhook" */
  type: string;
  typeVersion: number;
  /** [x, y] canvas position */
  position: [number, number];
  parameters: Record<string, unknown>;
  disabled?: boolean;
  /** Shown as a sticky note in the n8n canvas */
  notes?: string;
  notesInFlow?: boolean;
  credentials?: Record<string, N8nNodeCredential>;
  /** Required for webhook nodes */
  webhookId?: string;
}

// ── Workflow-level settings ───────────────────────────────────────────────────

export interface N8nWorkflowSettings {
  executionOrder: "v1";
  saveManualExecutions?: boolean;
  callerPolicy?: "workflowsFromSameOwner" | "any" | "none";
  errorWorkflow?: string;
  timezone?: string;
}

export interface N8nWorkflowMeta {
  templateCredsSetupCompleted: boolean;
  instanceId: string;
}

// ── Top-level workflow ────────────────────────────────────────────────────────

export interface N8nWorkflow {
  /** Workflow name shown in the n8n UI */
  name: string;
  nodes: N8nNode[];
  connections: N8nConnections;
  /** Pinned test data (empty for compiled workflows) */
  pinData: Record<string, unknown>;
  active: boolean;
  settings: N8nWorkflowSettings;
  /** Incremented on every save in n8n */
  versionId: string;
  meta: N8nWorkflowMeta;
  /** Workflow ID — set by n8n on creation; pass the IR id as a hint */
  id: string;
  tags: string[];
}

// ── n8n API response shapes ───────────────────────────────────────────────────

export interface N8nCreateWorkflowResponse {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface N8nDeployResult {
  workflowId: string;
  workflowUrl: string;
  active: boolean;
}