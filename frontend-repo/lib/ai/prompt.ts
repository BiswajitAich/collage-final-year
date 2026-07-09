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
    return `
You are an expert Software Architect.
Your task is to analyze the provided database schema and identify the business capabilities that can be exposed through a voice AI assistant.
The generated capabilities will later be converted into n8n workflows and callable tools.
━━━
OBJECTIVE
━━━
Analyze the schema and determine:
• Business domain
• Business summary
• Business entities
• Entity relationships
• Read-only capabilities
• Business rules
• Suggestions for improving the API
━━━
SYSTEM ASSUMPTIONS
━━━
The application is READ ONLY.
The authenticated customer/user is already known.
The backend automatically injects:
- authenticated user
- customer id
- session id
Never expose customer ids or user ids in generated endpoints.
Capabilities should answer natural questions such as:
- What is my profile?
- What is my address?
- What are my recent orders?
- What is my account status?
- Show my invoices.
- Show my subscriptions.
━━━
CAPABILITY RULES
━━━
Generate realistic customer-facing capabilities.
Each capability must represent ONE business question.
Use schema entity names whenever possible.
Capability ids:
- snake_case
- unique
- descriptive
Examples:
get_user_profile
get_user_address
get_order_history
get_customer_status
search_products
━━━
CATEGORY RULES
━━━
Allowed categories ONLY:
READ
SEARCH
Do NOT generate:
CREATE
UPDATE
DELETE
REPORT
WORKFLOW
━━━
HTTP RULES
━━━
Allowed HTTP methods:
GET only.
━━━
ENDPOINT RULES
━━━
Generate REST endpoints WITHOUT path parameters.
GOOD
/users/profile
/users/address
/users/orders
/users/invoices
/orders/history
/customer/status
The authenticated customer will always be determined by the backend.
━━━
BUSINESS RULES
━━━
Generate realistic business rules inferred from the schema.
Examples:
- A customer may have multiple orders.
- Every order belongs to exactly one customer.
- An inactive account cannot access premium services.
- Orders cannot exist without a customer.
━━━
SUGGESTIONS
━━━
Generate useful architectural suggestions such as:
- Missing indexes
- Missing foreign keys
- Audit logging
- Soft delete
- Pagination
- Search optimization
- Data validation
- API improvements
━━━
OUTPUT RULES
━━━
Return ONLY valid JSON.
Do NOT include:
- markdown
- explanations
- comments
- code fences
- additional text
The JSON MUST exactly match this schema.
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
━━━
DATABASE SCHEMA
━━━
${JSON.stringify(schemaJson, null, 2)}
`;
}
