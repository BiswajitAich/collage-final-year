import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const tools = [
  {
    name: "webhook",
    label: "Webhook",
    description: "Receive incoming HTTP requests",
    provider: "builtin",
    n8nType: "n8n-nodes-base.webhook",
    typeVersion: 2,
    color: "#00c8f8",
    category: "trigger",
    status: "ACTIVE" as const,
    config: { httpMethod: "GET", path: "/webhook", responseMode: "lastNode" },
  },
  {
    name: "validation",
    label: "Validation",
    description: "Validate incoming data against rules",
    provider: "builtin",
    n8nType: "n8n-nodes-base.code",
    typeVersion: 2,
    color: "#f5a623",
    category: "action",
    status: "ACTIVE" as const,
    config: { mode: "runOnceForAllItems" },
  },
  {
    name: "database",
    label: "Database Query",
    description: "Execute PostgreSQL queries",
    provider: "builtin",
    n8nType: "n8n-nodes-base.postgres",
    typeVersion: 2.5,
    color: "#10d48a",
    category: "action",
    status: "ACTIVE" as const,
    config: { operation: "select", table: "", returnAll: false, limit: 50 },
  },
  {
    name: "api-call",
    label: "API Call",
    description: "Make HTTP requests to external APIs",
    provider: "builtin",
    n8nType: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    color: "#7c6af7",
    category: "action",
    status: "ACTIVE" as const,
    config: { method: "GET", url: "", authentication: "none" },
  },
  {
    name: "business-logic",
    label: "Business Logic",
    description: "Execute custom JavaScript business logic",
    provider: "builtin",
    n8nType: "n8n-nodes-base.code",
    typeVersion: 2,
    color: "#e879f9",
    category: "action",
    status: "ACTIVE" as const,
    config: { mode: "runOnceForAllItems" },
  },
  {
    name: "condition",
    label: "Condition",
    description: "Branch workflow based on conditions",
    provider: "builtin",
    n8nType: "n8n-nodes-base.if",
    typeVersion: 2,
    color: "#f59e0b",
    category: "logic",
    status: "ACTIVE" as const,
    config: { operator: "equal", field: "", value: "" },
  },
  {
    name: "error",
    label: "Error Handler",
    description: "Stop workflow with error message",
    provider: "builtin",
    n8nType: "n8n-nodes-base.stopAndError",
    typeVersion: 1,
    color: "#f0455a",
    category: "response",
    status: "ACTIVE" as const,
    config: { errorMessage: "Workflow error" },
  },
  {
    name: "response",
    label: "Response",
    description: "Send response back to webhook caller",
    provider: "builtin",
    n8nType: "n8n-nodes-base.respondToWebhook",
    typeVersion: 1.1,
    color: "#5ba4f5",
    category: "response",
    status: "ACTIVE" as const,
    config: { respondWith: "json", responseCode: 200 },
  },
  {
    name: "merge",
    label: "Merge",
    description: "Merge multiple workflow branches",
    provider: "builtin",
    n8nType: "n8n-nodes-base.merge",
    typeVersion: 2,
    color: "#a78bfa",
    category: "logic",
    status: "INACTIVE" as const,
    config: { mode: "combine" },
  },
];

async function seed() {
  console.log("Seeding tools...");
  for (const tool of tools) {
    await prisma.tool.upsert({
      where: { name: tool.name },
      create: tool,
      update: {},
    });
    console.log(`  ✓ ${tool.name}`);
  }
  console.log("Done.");
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
