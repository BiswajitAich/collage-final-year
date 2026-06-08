// // ─── lib/workflow/__tests__/compiler.test.ts ──────────────────────────────────

// import { WorkflowIR, graphToN8n } from "@/lib/workflow";


// // ── Fixture: the exact output your LLM produces ───────────────────────────────
// // const CUSTOMER_VIEW_IR: WorkflowIR = {
// //   id: "customer-view-workflow",
// //   description: "View customer data with validation and approval",
// //   httpMethod: "GET",
// //   endpointType: "REST",
// //   graph: {
// //     edges: [
// //       { id: "trigger-to-validation",   source: "trigger",      target: "validation"   },
// //       { id: "validation-to-database",  source: "validation",   target: "database"     },
// //       { id: "database-to-validation-2",source: "database",     target: "validation-2" },
// //       { id: "validation-2-to-approval",source: "validation-2", target: "approval"     },
// //       { id: "approval-to-response",    source: "approval",     target: "response"     },
// //     ],
// //     nodes: [
// //       {
// //         id: "trigger",
// //         type: "webhook",
// //         label: "Customer View Request",
// //         description: "Customer data retrieval initiated",
// //         position: { x: 0, y: 100 },
// //         inputs: [],
// //         outputs: [{ id: "trigger-output", name: "trigger.output", type: "object" }],
// //         config: { path: "/customers", method: "GET" },
// //       },
// //       {
// //         id: "validation",
// //         type: "validation",
// //         label: "Validate Customer Data",
// //         description: "Validate customer data prior to retrieval",
// //         position: { x: 300, y: 100 },
// //         inputs:  [{ id: "validation-input",  name: "trigger.output",    type: "object" }],
// //         outputs: [{ id: "validation-output", name: "validation.output",  type: "object" }],
// //         config: { rules: "required fields: id, email", strict: true },
// //       },
// //       {
// //         id: "database",
// //         type: "database",
// //         label: "Retrieves Customer Data",
// //         description: "Retrieve customer data based on validation",
// //         position: { x: 600, y: 100 },
// //         inputs:  [{ id: "database-input",  name: "validation.output", type: "object" }],
// //         outputs: [{ id: "database-output", name: "database.output",   type: "object" }],
// //         config: { key: "id", table: "customers", operation: "read" },
// //       },
// //       {
// //         id: "validation-2",
// //         type: "validation",
// //         label: "Validate Retrieved Data",
// //         description: "Validate retrieved customer data",
// //         position: { x: 900, y: 100 },
// //         inputs:  [{ id: "validation-2-input",  name: "database.output",     type: "object" }],
// //         outputs: [{ id: "validation-2-output", name: "validation-2.output",  type: "object" }],
// //         config: { rules: "required fields: id, email", strict: true },
// //       },
// //       {
// //         id: "approval",
// //         type: "business-logic",
// //         label: "Check Approval Status",
// //         description: "Check approval status of customer data",
// //         position: { x: 1200, y: 100 },
// //         inputs:  [{ id: "approval-input",  name: "validation-2.output", type: "object" }],
// //         outputs: [{ id: "approval-output", name: "approval.output",      type: "boolean" }],
// //         config: { logic: "approval status must be true" },
// //       },
// //       {
// //         id: "response",
// //         type: "response",
// //         label: "Customer Data Response",
// //         description: "Customer data response with validation and approval",
// //         position: { x: 1500, y: 100 },
// //         inputs:  [{ id: "response-input", name: "approval.output", type: "boolean" }],
// //         outputs: [],
// //         config: { response: "retrieved customer data", statusCode: 200 },
// //       },
// //     ],
// //   },
// // };

// // ── Tests ─────────────────────────────────────────────────────────────────────

// function assert(condition: boolean, message: string): void {
//   if (!condition) throw new Error(`FAIL: ${message}`);
//   console.log(`  ✓  ${message}`);
// }

// function runTests(): void {
//   console.log("\n── Compiler tests ──────────────────────────────────────────\n");

//   // ── 1. Compilation succeeds ───────────────────────────────────────────────
//   const result = graphToN8n(CUSTOMER_VIEW_IR);

//   assert(result.success === true, "compile succeeds");
//   assert(!!result.workflow, "workflow is present");

//   const wf = result.workflow!;

//   // ── 2. Metadata ───────────────────────────────────────────────────────────
//   assert(wf.name === CUSTOMER_VIEW_IR.description, "workflow name matches description");
//   assert(wf.id === CUSTOMER_VIEW_IR.id, "workflow id is preserved");
//   assert(wf.active === false, "workflow is inactive by default");

//   // ── 3. Nodes ──────────────────────────────────────────────────────────────
//   assert(wf.nodes.length === 6, "6 nodes compiled");

//   const webhookNode = wf.nodes.find((n) => n.type === "n8n-nodes-base.webhook");
//   assert(!!webhookNode, "webhook node exists");
//   assert(webhookNode!.parameters.path === "/customers", "webhook path is /customers");
//   assert(webhookNode!.parameters.httpMethod === "GET", "webhook method is GET");
//   assert(typeof webhookNode!.webhookId === "string", "webhook has a webhookId UUID");

//   const validationNodes = wf.nodes.filter((n) => n.type === "n8n-nodes-base.code"
//     && String(n.parameters.jsCode).includes("required"));
//   assert(validationNodes.length === 2, "2 validation (Code) nodes exist");

//   const dbNode = wf.nodes.find((n) => n.type === "n8n-nodes-base.postgres");
//   assert(!!dbNode, "postgres node exists");
//   assert((dbNode!.parameters.table as any).value === "customers", "postgres table is customers");
//   assert(dbNode!.parameters.operation === "select", "read → select operation");

//   const responseNode = wf.nodes.find((n) => n.type === "n8n-nodes-base.respondToWebhook");
//   assert(!!responseNode, "respondToWebhook node exists");
//   assert((responseNode!.parameters.options as any).responseCode === 200, "response status 200");

//   // ── 4. Connections ────────────────────────────────────────────────────────
//   const connections = wf.connections;
//   assert(
//     !!connections["Customer View Request"],
//     "webhook node has outgoing connection"
//   );
//   assert(
//     connections["Customer View Request"].main[0][0].node === "Validate Customer Data",
//     "webhook → validation connection correct"
//   );
//   assert(
//     connections["Validate Customer Data"].main[0][0].node === "Retrieves Customer Data",
//     "validation → database connection correct"
//   );
//   assert(
//     connections["Retrieves Customer Data"].main[0][0].node === "Validate Retrieved Data",
//     "database → validation-2 connection correct"
//   );
//   assert(
//     connections["Validate Retrieved Data"].main[0][0].node === "Check Approval Status",
//     "validation-2 → approval connection correct"
//   );
//   assert(
//     connections["Check Approval Status"].main[0][0].node === "Customer Data Response",
//     "approval → response connection correct"
//   );

//   // ── 5. All nodes have UUIDs ───────────────────────────────────────────────
//   const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
//   for (const node of wf.nodes) {
//     assert(uuidRe.test(node.id), `node "${node.name}" has a valid UUID`);
//   }

//   // ── 6. Positions preserved ────────────────────────────────────────────────
//   assert(webhookNode!.position[0] === 0,    "webhook x=0");
//   assert(webhookNode!.position[1] === 100,  "webhook y=100");
//   assert(responseNode!.position[0] === 1500, "response x=1500");

//   // ── 7. Print compiled JSON ────────────────────────────────────────────────
//   console.log("\n── Compiled n8n JSON ───────────────────────────────────────\n");
//   console.log(JSON.stringify(wf, null, 2));

//   console.log("\n── All tests passed ✓ ──────────────────────────────────────\n");
// }

// // Guard so this can be imported by Jest or run directly with ts-node
// if (require.main === module) {
//   try {
//     runTests();
//   } catch (err) {
//     console.error(err instanceof Error ? err.message : err);
//     process.exit(1);
//   }
// }

// export { CUSTOMER_VIEW_IR };