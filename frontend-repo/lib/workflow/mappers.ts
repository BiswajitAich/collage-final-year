// ─── Node Mappers ─────────────────────────────────────────────────────────────
// Each mapper converts one WorkflowNode into the n8n-specific `type`,
// `typeVersion`, and `parameters` fields.  The compiler merges these with
// the shared fields (id, name, position, notes).

import type {
    // WorkflowNode,
    WebhookConfig,
    ValidationConfig,
    DatabaseConfig,
    ApiCallConfig,
    BusinessLogicConfig,
    ErrorConfig,
    ResponseConfig
} from "./types";
import type { N8nNode, N8nNodeCredential } from "./n8n-types";
import { WorkflowNode } from "@/app/(dashboard)/workflows/workflow.schema";

type MappedNode = Omit<N8nNode, "id" | "name" | "position" | "notes">;

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomId(): string {
    return crypto.randomUUID();
}

/** Parse "required fields: id, email, name" → ["id", "email", "name"] */
function parseRequiredFields(rules: string): string[] {
    const match = rules.match(/required fields?:\s*(.+)/i);
    if (!match) return [];
    return match[1].split(",").map((f) => f.trim()).filter(Boolean);
}

function mapDbOperation(op: string): string {
    const normalized = op.toLowerCase();
    if (["read", "get", "select", "fetch"].includes(normalized)) return "select";
    if (["write", "create", "insert", "post"].includes(normalized)) return "insert";
    if (["update", "patch", "put"].includes(normalized)) return "update";
    if (["delete", "remove", "destroy"].includes(normalized)) return "delete";
    return "select";
}

// ── 1. Webhook ────────────────────────────────────────────────────────────────

function mapWebhook(node: WorkflowNode): MappedNode {
    const cfg = node.config as Partial<WebhookConfig>;
    return {
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        webhookId: randomId(),
        parameters: {
            httpMethod: cfg.method ?? "GET",
            path: cfg.path ?? "/webhook",
            responseMode: "lastNode",
            options: {},
        },
    };
}

// ── 2. Validation (→ Code node) ───────────────────────────────────────────────

function buildValidationScript(fields: string[], strict: boolean): string {
    return `
// ── Auto-generated validation ──────────────────────────────
const item = $input.first().json;
const required = ${JSON.stringify(fields)};
const missing = required.filter(
  (f) => item[f] === undefined || item[f] === null || item[f] === ""
);

if (missing.length > 0) {
${strict
            ? `  throw new Error("Validation failed — missing fields: " + missing.join(", "));`
            : `  console.warn("[validation] missing optional fields:", missing.join(", "));`
        }
}

return $input.all();
`.trim();
}

function mapValidation(node: WorkflowNode): MappedNode {
    const cfg = node.config as Partial<ValidationConfig>;
    const fields = parseRequiredFields(cfg.rules ?? "");
    const strict = cfg.strict ?? true;

    return {
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        parameters: {
            mode: "runOnceForAllItems",
            jsCode: buildValidationScript(fields, strict),
        },
    };
}

// ── 3. Database (→ Postgres) ──────────────────────────────────────────────────

function buildPostgresParams(
    operation: string,
    table: string,
    key: string
): Record<string, unknown> {
    const schemaRef = { __rl: true, mode: "list", value: "public" };
    const tableRef = { __rl: true, mode: "list", value: table };

    switch (operation) {
        case "select":
            return {
                operation: "select",
                schema: schemaRef,
                table: tableRef,
                returnAll: false,
                limit: 50,
                where: {
                    values: [
                        { column: key, condition: "equal", value: `={{ $json.${key} }}` },
                    ],
                },
                sort: { values: [] },
                options: {},
            };

        case "insert":
            return {
                operation: "insert",
                schema: schemaRef,
                table: tableRef,
                columns: { mappingMode: "autoMapInputData", value: {} },
                options: { queryBatching: "independently" },
            };

        case "update":
            return {
                operation: "update",
                schema: schemaRef,
                table: tableRef,
                columns: { mappingMode: "autoMapInputData", value: {} },
                where: {
                    values: [
                        { column: key, condition: "equal", value: `={{ $json.${key} }}` },
                    ],
                },
                options: {},
            };

        case "delete":
            return {
                operation: "delete",
                schema: schemaRef,
                table: tableRef,
                where: {
                    values: [
                        { column: key, condition: "equal", value: `={{ $json.${key} }}` },
                    ],
                },
                options: {},
            };

        default:
            return { operation, schema: schemaRef, table: tableRef, options: {} };
    }
}

function mapDatabase(node: WorkflowNode): MappedNode {
    const cfg = node.config as Partial<DatabaseConfig>;
    const operation = mapDbOperation(cfg.operation ?? "read");
    const table = cfg.table ?? "table";
    const key = cfg.key ?? "id";

    const credential: N8nNodeCredential = {
        id: process.env.N8N_POSTGRES_CREDENTIAL_ID ?? "POSTGRES_CREDENTIAL_ID",
        name: "Postgres account",
    };

    return {
        type: "n8n-nodes-base.postgres",
        typeVersion: 2.5,
        parameters: buildPostgresParams(operation, table, key),
        credentials: { postgres: credential },
    };
}

// ── 4. API Call (→ HTTP Request) ──────────────────────────────────────────────

function mapApiCall(node: WorkflowNode): MappedNode {
    const cfg = node.config as Partial<ApiCallConfig>;
    const method = cfg.method ?? "GET";
    const hasBody = ["POST", "PUT", "PATCH"].includes(method);
    const hasHeaders = cfg.headers && Object.keys(cfg.headers).length > 0;

    return {
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        parameters: {
            method,
            url: cfg.url ?? "",
            authentication: "none",
            sendHeaders: hasHeaders,
            headerParameters: hasHeaders
                ? {
                    parameters: Object.entries(cfg.headers!).map(([name, value]) => ({
                        name,
                        value,
                    })),
                }
                : { parameters: [] },
            sendBody: hasBody,
            contentType: hasBody ? "json" : undefined,
            bodyParameters: hasBody
                ? { parameters: [{ name: "", value: "" }] }
                : undefined,
            options: {
                ...(cfg.retry
                    ? {
                        retry: {
                            enabled: true,
                            maxTries: 3,
                            waitBetweenTries: 1000,
                        },
                    }
                    : {}),
                response: { response: { responseFormat: "json" } },
            },
        },
    };
}

// ── 5. Business Logic (→ Code node) ──────────────────────────────────────────

function buildBusinessLogicScript(logic: string): string {
    return `
// ── Auto-generated business logic ─────────────────────────
// Rule: ${logic}
const items = $input.all();

const processed = items.map((item) => {
  const data = item.json;

  // TODO: Implement — "${logic}"
  // Replace the stub below with your actual logic.
  const result = {
    ...data,
    _processed: true,
    _rule: ${JSON.stringify(logic)},
    _timestamp: new Date().toISOString(),
  };

  return { json: result };
});

return processed;
`.trim();
}

function mapBusinessLogic(node: WorkflowNode): MappedNode {
    const cfg = node.config as Partial<BusinessLogicConfig>;
    return {
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        parameters: {
            mode: "runOnceForAllItems",
            jsCode: buildBusinessLogicScript(cfg.logic ?? node.description),
        },
    };
}

// ── 6. Error (→ Stop and Error) ───────────────────────────────────────────────

function mapError(node: WorkflowNode): MappedNode {
    const cfg = node.config as Partial<ErrorConfig>;
    return {
        type: "n8n-nodes-base.stopAndError",
        typeVersion: 1,
        parameters: {
            errorMessage: cfg.message ?? node.description ?? "Workflow error",
            ...(cfg.errorCode ? { errorCode: String(cfg.errorCode) } : {}),
        },
    };
}

// ── 7. Response (→ Respond to Webhook) ───────────────────────────────────────

function mapResponse(node: WorkflowNode): MappedNode {
    const cfg = node.config as Partial<ResponseConfig>;
    const statusCode = cfg.statusCode ?? 200;

    return {
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1.1,
        parameters: {
            respondWith: "json",
            responseBody: `={{ JSON.stringify($input.first().json) }}`,
            options: {
                responseCode: statusCode,
                responseHeaders: {
                    entries: [{ name: "Content-Type", value: "application/json" }],
                },
            },
        },
    };
}

// ── Registry ──────────────────────────────────────────────────────────────────

type MapperFn = (node: WorkflowNode) => MappedNode;

export const NODE_MAPPERS: Record<string, MapperFn> = {
    webhook: mapWebhook,
    validation: mapValidation,
    database: mapDatabase,
    "api-call": mapApiCall,
    "business-logic": mapBusinessLogic,
    error: mapError,
    response: mapResponse,
};

export type { MappedNode };