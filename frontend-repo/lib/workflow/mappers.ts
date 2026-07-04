// ─── Single Generic Node Mapper ───────────────────────────────────────────────
// All node type definitions come from the database (Tool model).
// This function converts any WorkflowNode into n8n format using the tool's config.

import type { N8nNode, N8nNodeCredential } from "./n8n-types";
import type { WorkflowNode } from "@/app/(dashboard)/workflows/workflow.schema";

type MappedNode = Omit<N8nNode, "id" | "name" | "position" | "notes">;

export interface ToolRecord {
  name: string;
  n8nType: string;
  typeVersion: number;
  config: unknown;
}

export function mapGeneric(node: WorkflowNode, tool: ToolRecord): MappedNode {
  const baseConfig = (tool.config ?? {}) as Record<string, unknown>;
  const nodeConfig = (node.config ?? {}) as Record<string, unknown>;
  const mergedConfig = { ...baseConfig, ...nodeConfig };

  const mapped: MappedNode = {
    type: tool.n8nType,
    typeVersion: tool.typeVersion,
    parameters: mergedConfig,
  };

  // Webhook nodes need a unique webhookId
  if (tool.name === "webhook") {
    mapped.webhookId = crypto.randomUUID();
  }

  // Database nodes need Postgres credentials
  if (tool.name === "database") {
    const credential: N8nNodeCredential = {
      id: process.env.N8N_POSTGRES_CREDENTIAL_ID ?? "POSTGRES_CREDENTIAL_ID",
      name: "Postgres account",
    };
    mapped.credentials = { postgres: credential };
  }

  return mapped;
}
