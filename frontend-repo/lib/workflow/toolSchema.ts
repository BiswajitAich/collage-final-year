import type { FilterSource } from "./generateSql";
import type { WorkflowGraphData } from "@/app/(dashboard)/workflows/workflow.schema";

export interface ToolSchemaProperty {
    type: "string";
}

export interface ToolSchema {
    type: "object";
    properties: Record<string, ToolSchemaProperty>;
    required: string[];
}

/**
 * Only values that the USER/LLM must provide.
 *
 * Runtime values such as auth, workflow variables, constants and
 * HTTP headers are injected automatically by the backend and must
 * never appear in the tool schema.
 */
const USER_INPUT_SOURCES: ReadonlySet<FilterSource> = new Set([
    "request.query",
    "request.body",
    "request.path",
]);

/**
 * Transport-level headers are never business arguments.
 */
const INTERNAL_PARAMETERS = new Set([
    "authorization",
    "cookie",
    "host",
    "accept",
    "content-type",
    "user-agent",
    "x-api-key",
]);

function isUserInputSource(source: unknown): source is FilterSource {
    return (
        typeof source === "string" &&
        USER_INPUT_SOURCES.has(source as FilterSource)
    );
}

function parameterNameOf(entry: Record<string, unknown>): string | null {
    const parameter = entry.parameter ?? entry.field;

    if (typeof parameter !== "string") {
        return null;
    }

    const name = parameter.trim();

    if (!name) {
        return null;
    }

    if (INTERNAL_PARAMETERS.has(name.toLowerCase())) {
        return null;
    }

    return name;
}

export function buildToolSchema(ir: WorkflowGraphData): ToolSchema {
    const properties: Record<string, ToolSchemaProperty> = {};
    const required = new Set<string>();

    const nodes = ir.graph?.nodes ?? [];

    for (const node of nodes) {
        const config = (node.config ?? {}) as Record<string, unknown>;

        let entries: unknown[] = [];

        switch (node.type) {
            case "database":
                if (Array.isArray(config.filters)) {
                    entries = config.filters;
                }
                break;

            case "validation":
                if (Array.isArray(config.rules)) {
                    entries = config.rules;
                }
                break;

            default:
                break;
        }

        for (const raw of entries) {
            if (!raw || typeof raw !== "object") {
                continue;
            }

            const entry = raw as Record<string, unknown>;

            if (!isUserInputSource(entry.source)) {
                continue;
            }

            const parameter = parameterNameOf(entry);

            if (!parameter) {
                continue;
            }

            properties[parameter] = {
                type: "string",
            };

            required.add(parameter);
        }
    }

    return {
        type: "object",
        properties,
        required: [...required],
    };
}
