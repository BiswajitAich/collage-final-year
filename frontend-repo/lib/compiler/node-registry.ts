export interface NodeRegistryEntry {
    label: string;
    description: string;
    llmDescription: string;
    n8nType: string;
    typeVersion: number;
    category: "trigger" | "logic" | "database" | "transform" | "response";
    allowedConfig: Record<string, unknown>;
    exampleConfig: Record<string, unknown>;
}

export const NODE_REGISTRY: Record<string, NodeRegistryEntry> = {
    webhook: {
        label: "Webhook",
        description: "Receives incoming HTTP requests.",
        llmDescription:
            "Always the first node. Starts the workflow by receiving an HTTP request.",
        n8nType: "n8n-nodes-base.webhook",
        typeVersion: 2,
        category: "trigger",
        allowedConfig: {
            path: "string",
            method: "GET | POST | PUT | PATCH | DELETE",
        },
        exampleConfig: {
            path: "/users/address",
            method: "GET",
        },
    },

    validation: {
        label: "Validation",
        description: "Validates request inputs.",
        llmDescription:
            "Checks required request parameters and routes valid or invalid requests.",
        n8nType: "n8n-nodes-base.if",
        typeVersion: 2,
        category: "logic",
        allowedConfig: {
            rules: [
                {
                    field: "string",
                    source: "query | headers | body",
                    operator: "exists | equals | empty",
                    value: "string (required for equals)",
                },
            ],
        },
        exampleConfig: {
            rules: [
                {
                    field: "addressId",
                    source: "query",
                    operator: "exists",
                },
            ],
        },
    },

    database: {
        label: "Database",
        description: "Reads business data.",
        llmDescription:
            "Represents an abstract database operation. NEVER generate SQL, table names, joins or PostgreSQL syntax.",
        n8nType: "n8n-nodes-base.postgres",
        typeVersion: 2.6,
        category: "database",
        allowedConfig: {
            operation: "READ | SEARCH | LOOKUP | AGGREGATE",
            entity: "string",
            fields: ["string"],
            filters: [
                {
                    field: "string",
                    source: "authenticatedUser | request",
                    parameter: "string",
                },
            ],
            sort: [
                {
                    field: "string",
                    direction: "ASC | DESC",
                },
            ],
            limit: "number",
        },
        exampleConfig: {
            operation: "READ",
            entity: "User",
            fields: ["address"],
            filters: [
                {
                    field: "id",
                    source: "authenticatedUser",
                },
            ],
            sort: [],
            limit: 1,
        },
    },

    condition: {
        label: "Condition",
        description: "Branches workflow execution.",
        llmDescription:
            "Branches execution only when different workflow paths are required.",
        n8nType: "n8n-nodes-base.if",
        typeVersion: 2,
        category: "logic",
        allowedConfig: {
            expression: "string",
        },
        exampleConfig: {
            expression: "address != null",
        },
    },

    transform: {
        label: "Transform",
        description: "Formats data.",
        llmDescription:
            "Maps or reshapes previous node output into the desired response format.",
        n8nType: "n8n-nodes-base.set",
        typeVersion: 3,
        category: "transform",
        allowedConfig: {
            mappings: [
                {
                    from: "string",
                    to: "string",
                },
            ],
        },
        exampleConfig: {
            mappings: [
                {
                    from: "address",
                    to: "address",
                },
            ],
        },
    },

    response: {
        label: "Response",
        description: "Returns successful response.",
        llmDescription:
            "Returns the successful HTTP response. Must always be a terminal node.",
        n8nType: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1,
        category: "response",
        allowedConfig: {
            status: "number",
            body: "json",
        },
        exampleConfig: {
            status: 200,
            body: "{{$json}}",
        },
    },

    error: {
        label: "Error",
        description: "Returns failure response.",
        llmDescription:
            "Returns an error response. Must always terminate a failed branch.",
        n8nType: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1,
        category: "response",
        allowedConfig: {
            status: "number",
            body: "json",
        },
        exampleConfig: {
            status: 400,
            body: {
                success: false,
                error: "Workflow failed",
            },
        },
    },
};
