import { describe, expect, it } from "vitest";
import { buildToolSchema } from "./toolSchema";
import type { WorkflowGraphData } from "@/app/(dashboard)/workflows/workflow.schema";

function ir(overrides: Partial<WorkflowGraphData> = {}): WorkflowGraphData {
    return {
        description: "",
        httpMethod: "GET",
        endpointType: "REST",
        graph: { nodes: [], edges: [] },
        ...overrides,
    };
}

describe("buildToolSchema", () => {
    it("includes request.query filters as required string properties", () => {
        const schema = buildToolSchema(
            ir({
                graph: {
                    nodes: [
                        {
                            id: "db",
                            type: "database",
                            label: "Database",
                            description: "",
                            position: { x: 0, y: 0 },
                            inputs: [],
                            outputs: [],
                            config: {
                                operation: "READ",
                                entity: "addresses",
                                fields: ["street"],
                                filters: [
                                    {
                                        field: "street",
                                        source: "request.query",
                                        parameter: "street",
                                    },
                                ],
                            },
                        },
                    ],
                    edges: [],
                },
            }),
        );

        expect(schema).toEqual({
            type: "object",
            properties: { street: { type: "string" } },
            required: ["street"],
        });
    });

    it("excludes auth, workflow, and constant sources", () => {
        const schema = buildToolSchema(
            ir({
                graph: {
                    nodes: [
                        {
                            id: "db",
                            type: "database",
                            label: "Database",
                            description: "",
                            position: { x: 0, y: 0 },
                            inputs: [],
                            outputs: [],
                            config: {
                                operation: "READ",
                                entity: "addresses",
                                fields: ["street"],
                                filters: [
                                    { field: "user_id", source: "auth" },
                                    {
                                        field: "run_id",
                                        source: "workflow",
                                        parameter: "runId",
                                    },
                                    {
                                        field: "status",
                                        source: "constant",
                                        value: "active",
                                    },
                                ],
                            },
                        },
                    ],
                    edges: [],
                },
            }),
        );

        expect(schema).toEqual({
            type: "object",
            properties: {},
            required: [],
        });
    });

    it("collects fields from validation node rules using 'field' as the parameter name", () => {
        const schema = buildToolSchema(
            ir({
                graph: {
                    nodes: [
                        {
                            id: "validation",
                            type: "validation",
                            label: "Validation",
                            description: "",
                            position: { x: 0, y: 0 },
                            inputs: [],
                            outputs: [],
                            config: {
                                rules: [
                                    {
                                        field: "authorization",
                                        source: "request.header",
                                        operator: "notEmpty",
                                    },
                                ],
                            },
                        },
                    ],
                    edges: [],
                },
            }),
        );

        expect(schema).toEqual({
            type: "object",
            properties: { authorization: { type: "string" } },
            required: ["authorization"],
        });
    });

    it("de-duplicates the same parameter declared across multiple nodes", () => {
        const schema = buildToolSchema(
            ir({
                graph: {
                    nodes: [
                        {
                            id: "validation",
                            type: "validation",
                            label: "Validation",
                            description: "",
                            position: { x: 0, y: 0 },
                            inputs: [],
                            outputs: [],
                            config: {
                                rules: [
                                    {
                                        field: "customer_id",
                                        source: "request.query",
                                        operator: "notEmpty",
                                    },
                                ],
                            },
                        },
                        {
                            id: "db",
                            type: "database",
                            label: "Database",
                            description: "",
                            position: { x: 0, y: 0 },
                            inputs: [],
                            outputs: [],
                            config: {
                                operation: "READ",
                                entity: "customers",
                                fields: ["id"],
                                filters: [
                                    {
                                        field: "id",
                                        source: "request.query",
                                        parameter: "customer_id",
                                    },
                                ],
                            },
                        },
                    ],
                    edges: [],
                },
            }),
        );

        expect(schema).toEqual({
            type: "object",
            properties: { customer_id: { type: "string" } },
            required: ["customer_id"],
        });
    });

    it("returns an empty schema when there are no caller-supplied filters", () => {
        const schema = buildToolSchema(ir());

        expect(schema).toEqual({
            type: "object",
            properties: {},
            required: [],
        });
    });
});
