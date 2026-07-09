import { beforeEach, describe, expect, it } from "vitest";
import { mapGeneric, type ToolRecord } from "./mappers";
import type { ParsedSchema } from "../types";
import type { WorkflowNode } from "@/app/(dashboard)/workflows/workflow.schema";

const schema: ParsedSchema = {
    enums: [],
    relationships: [],
    entities: [
        {
            name: "addresses",
            fields: [
                { name: "id", type: "String", nullable: false, primaryKey: true, isArray: false },
                { name: "user_id", type: "String", nullable: false, primaryKey: false, isArray: false },
                { name: "street", type: "String", nullable: false, primaryKey: false, isArray: false },
                { name: "city", type: "String", nullable: false, primaryKey: false, isArray: false },
                { name: "status", type: "String", nullable: false, primaryKey: false, isArray: false },
            ],
        },
    ],
};

const databaseTool: ToolRecord = {
    id: "builtin-database",
    name: "database",
    label: "Database",
    provider: "n8n",
    n8nType: "n8n-nodes-base.postgres",
    typeVersion: 2.6,
    color: "#10d48a",
    category: "database",
    status: "ACTIVE",
    config: {},
    builtin: true,
};

const defaults = { webhookPath: "webhook", httpMethod: "GET" };

const conditionTool: ToolRecord = {
    id: "builtin-condition",
    name: "condition",
    label: "Condition",
    provider: "n8n",
    n8nType: "n8n-nodes-base.if",
    typeVersion: 2,
    color: "#f59e0b",
    category: "logic",
    status: "ACTIVE",
    config: {},
    builtin: true,
};

function baseNode(config: Record<string, unknown>): WorkflowNode {
    return {
        id: "database",
        type: "database",
        label: "Database",
        description: "",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
        config,
    };
}

describe("mapGeneric - database node", () => {
    beforeEach(() => {
        process.env.N8N_POSTGRES_CREDENTIAL_ID = "cred-id";
        process.env.N8N_POSTGRES_CREDENTIAL_NAME = "Postgres account";
    });

    it("emits options.queryReplacement (not queryParameters) for request.query filters", () => {
        const node = baseNode({
            operation: "READ",
            entity: "addresses",
            fields: ["street"],
            filters: [{ field: "street", source: "request.query", parameter: "street" }],
        });

        const mapped = mapGeneric(node, databaseTool, schema, defaults);

        expect(mapped.parameters).toMatchObject({
            operation: "executeQuery",
            query: "SELECT street FROM addresses WHERE street = $1",
            options: { queryReplacement: "={{$json.query.street}}" },
        });
        expect(mapped.parameters).not.toHaveProperty("queryParameters");
    });

    it("emits options.queryReplacement for request.body filters", () => {
        const node = baseNode({
            operation: "READ",
            entity: "addresses",
            fields: ["street"],
            filters: [{ field: "street", source: "request.body", parameter: "street" }],
        });

        const mapped = mapGeneric(node, databaseTool, schema, defaults);

        expect(mapped.parameters).toMatchObject({
            options: { queryReplacement: "={{$json.body.street}}" },
        });
    });

    it("emits options.queryReplacement for request.path filters", () => {
        const node = baseNode({
            operation: "READ",
            entity: "addresses",
            fields: ["street"],
            filters: [{ field: "street", source: "request.path", parameter: "street" }],
        });

        const mapped = mapGeneric(node, databaseTool, schema, defaults);

        expect(mapped.parameters).toMatchObject({
            options: { queryReplacement: "={{$json.params.street}}" },
        });
    });

    it("emits options.queryReplacement for request.header filters", () => {
        const node = baseNode({
            operation: "READ",
            entity: "addresses",
            fields: ["street"],
            filters: [{ field: "street", source: "request.header", parameter: "x-street" }],
        });

        const mapped = mapGeneric(node, databaseTool, schema, defaults);

        expect(mapped.parameters).toMatchObject({
            options: { queryReplacement: "={{$json.headers.x-street}}" },
        });
    });

    it("emits options.queryReplacement for workflow filters", () => {
        const node = baseNode({
            operation: "READ",
            entity: "addresses",
            fields: ["street"],
            filters: [{ field: "street", source: "workflow", parameter: "street" }],
        });

        const mapped = mapGeneric(node, databaseTool, schema, defaults);

        expect(mapped.parameters).toMatchObject({
            options: { queryReplacement: "={{$json.street}}" },
        });
    });

    it("inlines auth filters from webhook query values", () => {
        const node = baseNode({
            operation: "READ",
            entity: "addresses",
            fields: ["street", "city"],
            filters: [{ field: "user_id", source: "auth", parameter: "user_id" }],
        });

        const mapped = mapGeneric(node, databaseTool, schema, defaults);

        expect(mapped.parameters).toMatchObject({
            operation: "executeQuery",
            query: "SELECT street, city FROM addresses WHERE user_id = '{{ $json.query.user_id }}'",
            options: {},
        });
    });

    it("emits options.queryReplacement for constant filters", () => {
        const node = baseNode({
            operation: "READ",
            entity: "addresses",
            fields: ["street"],
            filters: [{ field: "status", source: "constant", value: "active" }],
        });

        const mapped = mapGeneric(node, databaseTool, schema, defaults);

        expect(mapped.parameters).toMatchObject({
            options: { queryReplacement: '={{ "active" }}' },
        });
    });

    it("joins multiple filters into a single queryReplacement string in placeholder order", () => {
        const node = baseNode({
            operation: "READ",
            entity: "addresses",
            fields: ["street"],
            filters: [
                { field: "user_id", source: "auth", parameter: "user_id" },
                { field: "street", source: "request.query", parameter: "street" },
                { field: "status", source: "constant", value: "active" },
            ],
        });

        const mapped = mapGeneric(node, databaseTool, schema, defaults);

        expect(mapped.parameters).toMatchObject({
            query: "SELECT street FROM addresses WHERE user_id = '{{ $json.query.user_id }}' AND street = $1 AND status = $2",
            options: {
                queryReplacement:
                    '={{$json.query.street}},{{ "active" }}',
            },
        });
    });

    it("emits an empty options object when there are no filters", () => {
        const node = baseNode({
            operation: "READ",
            entity: "addresses",
            fields: ["street"],
        });

        const mapped = mapGeneric(node, databaseTool, schema, defaults);

        expect(mapped.parameters).toMatchObject({
            operation: "executeQuery",
            query: "SELECT street FROM addresses",
            options: {},
        });
    });
});

describe("mapGeneric - condition node", () => {
    it("emits a numeric rightValue for rows/notEmpty checks", () => {
        const node: WorkflowNode = {
            id: "condition",
            type: "condition",
            label: "Condition",
            description: "",
            position: { x: 0, y: 0 },
            inputs: [],
            outputs: [],
            config: {
                rules: [
                    {
                        field: "rows",
                        operator: "notEmpty",
                        value: null,
                    },
                ],
            },
        };

        const mapped = mapGeneric(node, conditionTool, schema, defaults);

        expect(mapped.parameters).toMatchObject({
            conditions: {
                conditions: [
                    {
                        leftValue: "={{Object.keys($json).length}}",
                        rightValue: 0,
                        operator: {
                            type: "number",
                            operation: "gt",
                        },
                    },
                ],
            },
        });
    });
});
