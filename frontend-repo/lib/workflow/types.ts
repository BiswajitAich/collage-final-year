// ─── Intermediate Representation (IR) ────────────────────────────────────────
// Shape produced by the LLM prompt and consumed by the compiler.

import { HttpMethod } from "@/app/(dashboard)/workflows/workflow.schema";

// export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// export type EndpointType = "REST" | "WEBHOOK";

// export type NodeType =
//   | "webhook"
//   | "validation"
//   | "database"
//   | "api-call"
//   | "business-logic"
//   | "error"
//   | "response";

export type DbOperation = "read";
//  | "write" | "update" | "delete";

// ── Per-node config shapes ────────────────────────────────────────────────────

export interface WebhookConfig {
    path: string;
    method: HttpMethod;
}

export interface ValidationConfig {
    rules: string; // e.g. "required fields: id, email"
    strict: boolean;
}

export interface DatabaseConfig {
    table: string;
    operation: DbOperation;
    key: string;
}

export interface ApiCallConfig {
    url: string;
    method: HttpMethod;
    headers?: Record<string, string>;
    retry?: boolean;
    bodyTemplate?: Record<string, unknown>;
}

export interface BusinessLogicConfig {
    logic: string;
}

export interface ErrorConfig {
    message?: string;
    errorCode?: number;
}

export interface ResponseConfig {
    statusCode: number;
    response: string;
}

// export type NodeConfig =
//   | WebhookConfig
//   | ValidationConfig
//   | DatabaseConfig
//   | ApiCallConfig
//   | BusinessLogicConfig
//   | ErrorConfig
//   | ResponseConfig
//   | Record<string, unknown>;

// ── Graph primitives ──────────────────────────────────────────────────────────

// export interface WorkflowPort {
//   id: string;
//   name: string;
//   type: "object" | "boolean" | "string" | "number" | "array";
// }

// export interface NodePosition {
//   x: number;
//   y: number;
// }

// export interface WorkflowNode {
//   id: string;
//   type: NodeType;
//   label: string;
//   description: string;
//   position: NodePosition;
//   inputs: WorkflowPort[];
//   outputs: WorkflowPort[];
//   config: NodeConfig;
// }

// export interface WorkflowEdge {
//   id: string;
//   source: string;
//   target: string;
//   /** Optional: which output port index this edge originates from (default 0) */
//   sourcePort?: number;
// }

// export interface WorkflowGraph {
//   nodes: WorkflowNode[];
//   edges: WorkflowEdge[];
// }

// ── Top-level IR ──────────────────────────────────────────────────────────────

// export interface WorkflowIR {
//   id: string;
//   description: string;
//   httpMethod: HttpMethod;
//   endpointType: EndpointType;
//   graph: WorkflowGraph;
// }

// ── Compiler result ───────────────────────────────────────────────────────────

export interface CompileResult {
    success: boolean;
    workflow?: import("./n8n-types").N8nWorkflowCreate;
    errors?: string[];
    warnings?: string[];
}
