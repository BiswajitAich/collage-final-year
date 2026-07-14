import { Prisma } from "../generated/prisma/client";
export function buildWorkflowPrompt(
    workflowOptions: Prisma.InputJsonValue,
    capability: {
        id: string;
        name: string;
        description: string;
        category: string;
        suggestedMethod: string;
        suggestedEndpoint: string;
        entities: string[];
    },
    schemaSummary: string,
    availableNodeTypes?: string[],
): string {
    const nodeTypes = availableNodeTypes?.length
        ? availableNodeTypes.map((t) => `'${t}'`).join(" | ")
        : `'webhook' | 'validation' | 'database' | 'response' | 'transform' | 'error' | 'condition' | 'merge'`;

    return `You generate exactly ONE workflow graph JSON for this project. Return ONLY valid JSON. No markdown, comments, code fences, or extra text.

CONTEXT
capability_id=${capability.id}
capability_name=${capability.name}
description=${capability.description}
category=${capability.category}
http_method=${capability.suggestedMethod}
endpoint=${capability.suggestedEndpoint}
entities=${capability.entities.join(", ")}
workflow_options=${JSON.stringify(workflowOptions)}

DATABASE_SCHEMA
${schemaSummary}

HARD_RULES
- Create a READ ONLY workflow only.
- Use only entities and fields present in DATABASE_SCHEMA.
- Authentication already exists.
- Never generate SQL.
- endpointType must be "WEBHOOK".
- Allowed node.type values: ${nodeTypes}.
- The first node must be a webhook node.
- Webhook must be the only entry node.
- Write the details for the workflow properly with needed input, output and the response that will got.
- Webhook config must be {"method":"${capability.suggestedMethod}","path":"${capability.suggestedEndpoint}"}.
- The graph must be connected. No orphan nodes.
- Node ids must be unique. Node labels must be unique.
- Use exactly one database node.
- Use validation only when user input is required from request.query, request.body, request.path, or request.header.
- Do not create validation for auth-only workflows.
- For GET workflows, caller-provided business arguments should normally use request.query.
- Transport headers such as authorization are internal and must not be business arguments.
- Authenticated lookups must include {"field":"user_id","source":"auth","parameter":"user_id"} unless a different schema field is clearly the correct auth key.
- Use condition only when the database can return zero rows.
- Use transform only when response shaping or field renaming is required.
- Every branch must end in a terminal reply node. Use response for success branches and error for failure branches. Never leave a branch without a reply node.
- Response and error nodes have no outgoing edges.

NODE_CONFIG
- webhook: {"method":"${capability.suggestedMethod}","path":"${capability.suggestedEndpoint}"}
- validation: {"rules":[{"field":"string","source":"request.query | request.body | request.path | request.header | workflow | auth","operator":"exists | equals | empty","value":any}]}
- database: {"operation":"READ","entity":"string","fields":["field1","field2"],"filters":[{"field":"string","source":"request.query | request.body | request.path | request.header | workflow | auth | constant","parameter":"string","value":any}],"limit":1}
- condition: {"rules":[{"field":"rows","operator":"notEmpty","value":null}]}
- transform: {"mappings":[{"from":"field","to":"field"}]}
- response: {}
- error: {"status":400}

PORTS
- webhook.outputs=[{"id":"output0","name":"next","type":"object"}]
- validation.outputs=[{"id":"output0","name":"true","type":"boolean"},{"id":"output1","name":"false","type":"boolean"}]
- database.outputs=[{"id":"output0","name":"next","type":"object"}]
- condition.outputs=[{"id":"output0","name":"true","type":"boolean"},{"id":"output1","name":"false","type":"boolean"}]
- transform.outputs=[{"id":"output0","name":"next","type":"object"}]
- response.outputs=[]
- error.outputs=[]

EDGE_RULES
- sourceHandle must be "output0" or "output1" when present.
- webhook, database, and transform continue through output0.
- validation output0 = valid branch, output1 = failure branch.
- condition output0 = record found, output1 = not found.
- Database has exactly one outgoing edge from output0.
- Each terminal branch must end in response or error.

LAYOUT
- Main flow positions: (0,0) -> (300,0) -> (600,0) -> (900,0) -> (1200,0).
- Branch nodes use y=150 or y=-150.
- Place webhook at {"x":0,"y":0}.

OUTPUT_FORMAT
{
  "id":"${capability.id}",
  "name":"${capability.name}",
  "description":"${capability.description}",
  "httpMethod":"${capability.suggestedMethod}",
  "endpointType":"WEBHOOK",
  "graph":{
    "nodes":[
      {
        "id":"string",
        "type":"string",
        "label":"string",
        "description":"string",
        "position":{"x":0,"y":0},
        "inputs":[],
        "outputs":[],
        "config":{}
      }
    ],
    "edges":[
      {
        "id":"string",
        "source":"string",
        "target":"string",
        "sourceHandle":"output0"
      }
    ]
  }
}`;
}

export function buildReviewAnalysisPrompt(
    schemaJson: Prisma.InputJsonValue,
): string {
    return `Analyze the database schema and return a compact product-capability review for a read-only voice AI assistant.

Return ONLY valid JSON. No markdown, comments, code fences, or extra text.

GOAL
- Infer the business domain and a short summary.
- Propose customer-facing read/search capabilities.
- Infer business rules from entities and relationships.
- Suggest practical API/data improvements.
- Highlight when a capability likely needs a multi-step workflow: auth user_id -> related entity lookup -> final response.

ASSUMPTIONS
- App is READ ONLY.
- Authenticated user/customer/session are already known by backend.
- Never require or expose customer_id/user_id in public endpoints.
- Internal workflow/tool execution may start from authenticated user_id.
- If target data depends on another identifier (for example customer_id, account_id, profile_id, subscription_id), suggest a workflow that first resolves that identifier from user_id, then uses it for the final read.
- Prefer capabilities that can be fulfilled either directly by user_id or by a user_id -> related_id -> final data lookup chain.
- Capabilities should map to natural user questions like profile, address, orders, invoices, subscriptions, account status, product search.

CAPABILITY RULES
- Each capability answers exactly ONE business question.
- Prefer names grounded in schema entities.
- Only categories: READ, SEARCH.
- suggestedMethod must always be GET.
- suggestedEndpoint must be REST-style, lowercase, no path params, no IDs.
- Good endpoint examples: /users/profile, /users/orders, /orders/history, /customer/status, /products/search
- id must be unique, descriptive, snake_case.
- Include only capabilities supported by the schema.
- Prefer capabilities that are scoped to the authenticated user.
- When direct user-scoped access is not obvious, infer capabilities that can be implemented through an internal lookup chain starting from user_id.
- Avoid internal/admin/write/reporting capabilities unless clearly customer-facing and read-only.

BUSINESS RULES
- Infer realistic rules only from schema evidence.
- Keep each rule specific and tied to listed entities.

SUGGESTIONS
- Prefer concrete architectural suggestions: indexes, foreign keys, pagination, search optimization, auditability, soft delete, validation, naming consistency, API shape.
- Include workflow-oriented suggestions when relevant, especially: resolve customer/account/profile/subscription/order ownership from authenticated user_id before reading final data.
- If schema separation requires multiple reads, suggest creating an internal lookup workflow/tool chain rather than exposing raw IDs to clients.
- Keep suggestions grounded in likely schema gaps or risks.

OUTPUT JSON SHAPE
{
  "domain": "string",
  "summary": "string",
  "confidence": 0,
  "capabilities": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "entities": ["string"],
      "category": "READ",
      "confidence": 0,
      "suggestedEndpoint": "string",
      "suggestedMethod": "GET"
    }
  ],
  "businessRules": [
    {
      "id": "string",
      "rule": "string",
      "entities": ["string"],
      "confidence": 0
    }
  ],
  "suggestions": [
    {
      "title": "string",
      "reason": "string",
      "priority": "low"
    }
  ]
}

STRICT RULES
- Use exactly these top-level keys: domain, summary, confidence, capabilities, businessRules, suggestions.
- category must be only READ or SEARCH.
- suggestedMethod must be only GET.
- priority must be only low, medium, or high.
- confidence must be a number from 0 to 1.
- If uncertain, lower confidence instead of inventing facts.
- Output must be parseable JSON.

DATABASE_SCHEMA
${JSON.stringify(schemaJson)}
`;
}
