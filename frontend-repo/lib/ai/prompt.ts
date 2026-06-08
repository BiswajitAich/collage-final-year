import { Prisma } from "../generated/prisma/client";

export function buildReviewAnalysisPrompt(SCHEMA_JSON: Prisma.InputJsonValue): string {
   return `
You are a software architect analyzing a database schema.

Identify:

* Business domain
* Business entities
* Relationships
* Read-only capabilities
* Business rules

Return ONLY valid JSON.

Rules:

* Generate realistic user-facing capabilities.
* Use schema entity names.
* Capability ids must be snake_case.
* REST endpoints only.
* Methods: GET only.
* Categories: READ or SEARCH only.
* Focus on retrieval/query operations.
* Input will always be user/customer id called via webhook.


Generate capabilities that answer user questions.


Output(STRICT):
{
   "domain":"string",
   "summary":"string",
   "confidence": decimal,
   "capabilities":[
      {
         "id":"string",
         "name":"string",
         "description":"string",
         "entities":[
            "string"
         ],
         "category":"READ",
         "confidence": decimal,
         "suggestedEndpoint":"string",
         "suggestedMethod":"GET"
      }
   ],
   "businessRules":[
      {
         "id":"string",
         "rule":"string",
         "entities":[
            "string"
         ],
         "confidence": decimal
      }
   ],
   "suggestions":[
      {
         "title":"string",
         "reason":"string",
         "priority":"low"|"high"|"medium"
      }
   ]
}

Schema:
${JSON.stringify(SCHEMA_JSON)}
`;

}
export function buildWorkflowPrompt(workflowJson: Prisma.InputJsonValue): string {
   return `
You are an expert workflow compiler that converts business intent into a strict n8n-compatible DAG.

IMPORTANT:
This system is READ-ONLY.

Allowed:
- Retrieve data
- Search data
- Lookup records
- Aggregate data
- Validate inputs
- Transform responses

Forbidden:
- Create
- Insert
- Update
- Patch
- Delete
- Upsert
- Execute destructive actions

Layout rules: 
- Left to right with proper flow only 
- x increments: 0 → 300 → 600 → 900 → ... 
- y stays 100 for linear flows 
- branch only if required (then use y offsets ±150)

Rules:
* ids must be unique and not empty/null.
* Edges - "source" , "target" should be related to "nodes" -> "id".
* Initial node - always -> 'webhook' type, listining: user/customer id.
* Handle error and success return with proper logical condition, if needed.
* Always validate input before querying to database.
* Keep workflows minimal.
* Database operations must be: read | lookup | search | aggregate.
* Maintain Layout rules positions x, y.
* Create proper config path.

Available node type: 
- 'webhook' 
- 'validation'
- 'database' 
- 'api-call' 
- 'response' 
- 'error'
- 'condition'
- 'merge'

Output ONLY valid JSON.

FORMAT(STRICT):
{
   "id":"",
   "name":"",
   "description":"",
   "httpMethod":"GET | POST | PATCH",
   "endpointType":"REST | WEBHOOK",
   "graph":{
      "nodes":[
         {
            "id":"",
            "type":"webhook" | "validation" | "database" | "api-call" | "response" | "error" | "condition" | "merge",
            "label":"",
            "description":"",
            "position":{
               "x":"number",
               "y":"number"
            },
            "inputs":[
               
            ],
            "outputs":[
               {
                  "id":"",
                  "name":"",
                  "type":""
               }
            ],
            "config":{
               "path":"",
               "method":"GET" | "POST" | "PATCH"
            }
         }
      ],
      "edges":[
         {
            "id":"",
            "source":"",
            "target":""
         }
      ]
   }
}

If a request requires data modification, generate an error workflow instead.

Workflow direction:
${JSON.stringify(workflowJson)}

Generate the workflow json.
`;
}