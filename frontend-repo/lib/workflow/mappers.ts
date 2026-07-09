import { ParsedSchema } from "../types";
import { DatabaseOperation, generateSql } from "./generateSql";
import type { N8nNode } from "./n8n-types";
import type { WorkflowNode } from "@/app/(dashboard)/workflows/workflow.schema";

type MappedNode = Omit<N8nNode, "id" | "name" | "position" | "notes">;
interface WorkflowDefaults {
    webhookPath: string;
    httpMethod: string;
}

export interface ToolRecord {
    id: string;
    name: string;
    label: string;
    description?: string;
    provider: string;
    n8nType: string;
    typeVersion: number;
    color: string;
    category: string;
    apiBaseUrl?: string | null;
    status: string;
    lastSync?: Date | null;
    config: Record<string, unknown>;
    allowedConfig?: Record<string, unknown>;
    exampleConfig?: Record<string, unknown>;
    builtin: boolean;
}

export function mapGeneric(
    node: WorkflowNode,
    tool: ToolRecord,
    parsedSchema: ParsedSchema,
    defaults: WorkflowDefaults,
): MappedNode {
    const nodeConfig = (node.config ?? {}) as Record<string, unknown>;
    const mapped: MappedNode = {
        type: tool.n8nType,
        typeVersion: tool.typeVersion,
        parameters: {},
    };

    switch (tool.name) {
        case "webhook": {
            mapped.webhookId = crypto.randomUUID();
            const path =
                typeof nodeConfig.path === "string"
                    ? nodeConfig.path
                    : defaults.webhookPath;

            mapped.parameters = {
                httpMethod:
                    typeof nodeConfig.method === "string"
                        ? nodeConfig.method
                        : defaults.httpMethod,
                path: path.replace(/^\/+/, ""),
                responseMode: "responseNode",
            };
            break;
        }

        case "validation": {
            mapped.parameters = buildValidationParameters(
                nodeConfig,
                "validation",
            );
            break;
        }

        case "database": {
            const credentialId = process.env.N8N_POSTGRES_CREDENTIAL_ID;
            const credentialName = process.env.N8N_POSTGRES_CREDENTIAL_NAME;

            if (!credentialId || !credentialName) {
                throw new Error("Missing PostgreSQL credential configuration.");
            }

            mapped.credentials = {
                postgres: {
                    id: credentialId,
                    name: credentialName,
                },
            };

            const dbConfig = node.config;

            if (
                !dbConfig ||
                typeof dbConfig !== "object" ||
                !("operation" in dbConfig) ||
                !("entity" in dbConfig) ||
                !("fields" in dbConfig)
            ) {
                throw new Error("Invalid database node configuration.");
            }

            const { sql, parameters } = generateSql(
                dbConfig as DatabaseOperation,
                parsedSchema,
            );
            console.log("SQL:", sql);
            console.log("Parameters:", parameters);
            mapped.parameters = {
                operation: "executeQuery",
                query: sql,
                options: parameters.length
                    ? { queryReplacement: buildQueryReplacement(parameters) }
                    : {},
            };
            mapped.alwaysOutputData = true;
            console.log("DATABASE NODE");
            console.log(JSON.stringify(mapped, null, 2));
            break;
        }

        case "transform": {
            const mappings = getTransformMappings(nodeConfig);
            mapped.parameters = {
                assignments: {
                    assignments: mappings.length
                        ? mappings
                        : [
                              {
                                  name: "data",
                                  value: "={{$json}}",
                                  type: "object",
                              },
                          ],
                },
                options: {},
            };
            break;
        }

        case "condition": {
            mapped.parameters = buildValidationParameters(
                nodeConfig,
                "condition",
            );
            break;
        }

        case "merge": {
            mapped.parameters = {
                mode: "append",
            };
            break;
        }

        case "response": {
            mapped.parameters = {
                respondWith: "json",
                responseBody: "={{$json}}",
                options: {},
            };
            break;
        }

        case "error": {
            mapped.parameters = {
                errorMessage:
                    typeof nodeConfig.errorMessage === "string"
                        ? nodeConfig.errorMessage
                        : "Workflow failed",
            };
            break;
        }

        default:
            throw new Error(`Unsupported tool "${tool.name}"`);
    }

    return mapped;
}

/**
 * The n8n Postgres node (Execute Query operation) does not have a
 * `queryParameters` property. Query parameters are instead supplied via
 * `options.queryReplacement`, a single string field. n8n scans that string
 * for every `{{ ... }}` expression (regardless of separators) and evaluates
 * each one, in left-to-right order, as $1, $2, $3, etc. Any part of the
 * string that isn't inside a `{{ ... }}` block is ignored once at least one
 * resolvable is present, so every parameter — including constants — must be
 * wrapped in its own `{{ ... }}` block (see generateSql.ts).
 *
 * The whole field must be prefixed with a single leading `=` to be
 * evaluated as an expression at all, so we strip any per-parameter `=`
 * prefixes before joining.
 */
function buildQueryReplacement(parameters: string[]): string {
    const expressions = parameters.map((param) => param.replace(/^=+/, ""));
    return `=${expressions.join(",")}`;
}

function getTransformMappings(config: Record<string, unknown>): {
    name: string;
    value: string;
    type: string;
}[] {
    const raw = config.mappings;
    if (!Array.isArray(raw)) return [];

    const assignments: { name: string; value: string; type: string }[] = [];

    for (const item of raw) {
        if (!item || typeof item !== "object") continue;
        const from = (item as { from?: unknown }).from;
        const to = (item as { to?: unknown }).to;
        if (typeof from !== "string" || typeof to !== "string") continue;
        if (!from.trim() || !to.trim()) continue;

        assignments.push({
            name: to.trim(),
            value: `={{$json.${from.trim()}}}`,
            type: "string",
        });
    }

    return assignments;
}

function buildValidationParameters(
    config: Record<string, unknown>,
    nodeType: "validation" | "condition",
) {
    const rules = Array.isArray(config.rules) ? config.rules : [];
    const conditions: Array<Record<string, unknown>> = [];

    for (const rule of rules) {
        if (!rule || typeof rule !== "object") continue;
        const field = (rule as { field?: unknown }).field;
        const operator = (rule as { operator?: unknown }).operator;
        const source = (rule as { source?: unknown }).source;
        const expectedValue = (rule as { value?: unknown }).value;

        if (typeof field !== "string" || !field.trim()) continue;
        if (field.trim().toLowerCase() === "rows") {
            const wantsEmpty = operator === "empty";
            conditions.push({
                leftValue: "={{Object.keys($json).length}}",
                rightValue: 0,
                operator: {
                    type: "number",
                    operation: wantsEmpty ? "equals" : "gt",
                },
            });
            continue;
        }

        let expression: string;
        switch (source) {
            case "request.query":
                expression = `={{$json.query.${field}}}`;
                break;

            case "request.body":
                expression = `={{$json.body.${field}}}`;
                break;

            case "request.path":
                expression = `={{$json.params.${field}}}`;
                break;

            case "request.header":
                expression = `={{$json.headers.${field}}}`;
                break;

            case "workflow":
                expression = `={{$json.${field}}}`;
                break;

            case "auth":
                expression = `={{$json.query.${field}}}`;
                break;

            default:
                expression = `={{$json.${field}}}`;
        }

        if (operator === "equals" && typeof expectedValue === "string") {
            conditions.push({
                leftValue: expression,
                rightValue: expectedValue,
                operator: { type: "string", operation: "equals" },
            });
            continue;
        }

        if (operator === "empty") {
            conditions.push({
                leftValue: expression,
                rightValue: "",
                operator: {
                    type: "string",
                    operation: "empty",
                    singleValue: true,
                },
            });
            continue;
        }

        conditions.push({
            leftValue: expression,
            rightValue: "",
            operator: {
                type: "string",
                operation: "notEmpty",
                singleValue: true,
            },
        });
    }

    if (conditions.length === 0) {
        throw new Error(
            `${nodeType} node requires at least one valid rule in config.rules.`,
        );
    }

    return {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: "",
                typeValidation: "strict",
                version: 1,
            },
            conditions,
            combinator: "and",
        },
        options: {},
    };
}
