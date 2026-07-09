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
    id: string;
    name: string;
    type: string;
    typeVersion: number;
    position: [number, number];
    parameters: Record<string, unknown>;
    disabled?: boolean;
    notes?: string;
    notesInFlow?: boolean;
    credentials?: Record<string, N8nNodeCredential>;
    webhookId?: string;
    alwaysOutputData?: boolean;
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

export interface N8nWorkflowCreate {
    name: string;
    nodes: N8nNode[];
    connections: N8nConnections;
    pinData: Record<string, unknown>;
    active: boolean;
    settings: N8nWorkflowSettings;
    tags: string[];
}

export interface N8nWorkflow extends N8nWorkflowCreate {
    id: string;
    versionId: string;
    meta: N8nWorkflowMeta;
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
