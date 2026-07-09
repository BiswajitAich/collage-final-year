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
    return `Return ONLY valid JSON for capability analysis. No markdown, comments, code fences, or extra text.

ROLE
You analyze a database schema for a voice assistant that supports authenticated, read-only customer workflows.

HARD_RULES
- App is READ ONLY.
- Authenticated user_id is always available automatically.
- Prefer capabilities that can start from user_id only.
- Do NOT require the caller to provide customer_id, order_id, address_id, subscription_id, invoice_id, or any other internal ID.
- If another ID is needed, assume the workflow should fetch it from the database using user_id, then continue.
- Never expose raw internal IDs in endpoints or capability descriptions.
- Capabilities must be realistic voice queries a customer would ask.
- Each capability = one business question.
- Use GET only.
- Categories allowed: READ, SEARCH.
- Do NOT generate CREATE, UPDATE, DELETE, REPORT, or WORKFLOW capabilities.
- Endpoints must be REST-style, no path params, no IDs in the path.
- Prefer user-centric endpoints like /users/profile, /users/address, /users/orders, /customer/status.
- Use schema entity names when helpful, but optimize for real user questions.

GOOD_CAPABILITIES EXAMPLES
- What is my profile?
- What is my address?
- What is my account status?
- What are my recent orders?
- Show my invoices.
- Show my subscriptions.

CAPABILITY_NAMING
- id must be snake_case, unique, descriptive
- examples: get_user_profile, get_user_address, get_order_history, get_customer_status, search_products

BUSINESS_RULES
Infer realistic domain rules from the schema.

SUGGESTIONS
Prefer practical suggestions: indexes, foreign keys, pagination, audit logs, soft delete, validation, search optimization, API improvements.

OUTPUT_SCHEMA
{
  "domain": "string",
  "summary": "string",
  "confidence": number,
  "capabilities": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "entities": ["string"],
      "category": "READ" | "SEARCH",
      "confidence": number,
      "suggestedEndpoint": "string",
      "suggestedMethod": "GET"
    }
  ],
  "businessRules": [
    {
      "id": "string",
      "rule": "string",
      "entities": ["string"],
      "confidence": number
    }
  ],
  "suggestions": [
    {
      "title": "string",
      "reason": "string",
      "priority": "low" | "medium" | "high"
    }
  ]
}

DATABASE_SCHEMA
${JSON.stringify(schemaJson)}
`;
}
