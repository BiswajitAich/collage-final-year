"use server";

import { getUser } from "@/app/(auth)/login/action";
import prisma from "@/lib/prisma";
import { graphToN8n } from "@/lib/workflow";
import { getDbTools } from "@/app/(dashboard)/tools/action";
import { cacheLife, cacheTag } from "next/cache";
import { WorkflowGraphData } from "../workflow.schema";
import { ParsedSchema } from "@/lib/types";
import { buildToolSchema } from "@/lib/workflow/toolSchema";
import { Prisma } from "@/lib/generated/prisma/browser";

export async function cacheHelper(ownerId: string) {
    "use cache";
    cacheLife("hours");
    cacheTag(`get-workflow-${ownerId}`);
    return await prisma.workflow.findMany({
        where: { ownerId },
        select: {
            id: true,
            name: true,
            description: true,
            status: true,
            endpoint: true,
            httpMethod: true,
            executionCount: true,
            successRate: true,
            avgLatencyMs: true,
            updatedAt: true,
        },
        take: 20,
    });
}
export async function getWorkFlows() {
    const user = await getUser();
    if (!user?.id) {
        return null;
    }
    return await cacheHelper(user.id);
}
export async function getWorkflowById(id: string) {
    return await prisma.workflow.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            description: true,
            status: true,
            endpoint: true,
            httpMethod: true,
            endpointType: true,
            requiresAuth: true,
            generationMode: true,
            executionCount: true,
            successRate: true,
            avgLatencyMs: true,
            n8nWorkflowId: true,
            workflowJson: true,
            createdAt: true,
            updatedAt: true,
        },
    });
}
export async function addWorkflowToN8n(id: string) {
    console.log("[CHECKPOINT 1] addWorkflowToN8n called with id:", id);
    if (!id) {
        console.log("[ERROR] Id not received!");
        throw new Error("Id not received!");
    }
    const n8nUrl = process.env.N8N_URL;
    console.log("[CHECKPOINT 2] N8N_URL from env:", n8nUrl);
    if (!n8nUrl) {
        console.log("[ERROR] n8n url incorrect!");
        throw new Error("n8n url incorrect!");
    }
    const baseUrl = n8nUrl.replace(/\/$/, "");
    const headers = {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": process.env.N8N_API_KEY!,
    };
    let res = null;
    let createdWorkflowId = null;
    let workflow = null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
        workflow = await prisma.workflow.findUnique({
            where: { id },
            select: {
                id: true,
                workflowJson: true,
                n8nWorkflowId: true,
                schemaId: true,
            },
        });
        if (!workflow) {
            throw new Error("Workflow not found.");
        }
        const schema = await prisma.uploadedSchema.findUnique({
            where: { id: workflow?.schemaId },
            select: { parsedJson: true },
        });
        if (!schema) {
            throw new Error("Schema not found.");
        }

        if (!schema.parsedJson) {
            throw new Error("Schema has not been parsed.");
        }
        console.log(
            "[CHECKPOINT 3] DB workflow lookup:",
            JSON.stringify(workflow, null, 2),
        );

        if (!workflow?.workflowJson) {
            console.log("[ERROR] workflow?.workflowJson is null/falsy");
            throw new Error("workflow?.workflowJson mismatch!");
        }
        const tools = await getDbTools();
        const parsedSchema = schema.parsedJson as unknown as ParsedSchema;
        console.log("parsedSchema-----------------------------");
        console.log(parsedSchema);
        console.log("parsedSchema-----------------------------");
        const compiled = graphToN8n(
            workflow.workflowJson as WorkflowGraphData,
            tools,
            parsedSchema,
        );
        console.log(
            "[CHECKPOINT 4] graphToN8n result:",
            JSON.stringify(
                {
                    success: compiled.success,
                    errors: compiled.errors,
                    warnings: compiled.warnings,
                    nodeCount: compiled.workflow?.nodes?.length,
                },
                null,
                2,
            ),
        );

        if (!compiled.success || !compiled.workflow) {
            console.log(
                "[ERROR] Compilation failed:",
                compiled.errors?.join(", "),
            );
            throw new Error(
                compiled.errors?.join(", ") ?? "Compilation failed",
            );
        }
        const payload = {
            // id: workflow.id,
            name: compiled.workflow.name,
            nodes: compiled.workflow.nodes,
            connections: compiled.workflow.connections,
            settings: compiled.workflow.settings,
        };
        console.log(
            "[CHECKPOINT 5] Compiled payload ready:",
            JSON.stringify(
                {
                    name: payload.name,
                    nodeCount: payload.nodes.length,
                    hasConnections: Object.keys(payload.connections).length > 0,
                },
                null,
                2,
            ),
        );

        if (workflow?.n8nWorkflowId) {
            console.log(
                "[CHECKPOINT 5a] Updating existing n8n workflow:",
                workflow.n8nWorkflowId,
            );
            res = await fetch(
                `${baseUrl}/api/v1/workflows/${workflow.n8nWorkflowId}`,
                {
                    method: "PUT",
                    headers,
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                },
            );
        } else {
            console.log("[CHECKPOINT 5b] Creating new workflow in n8n");
            res = await fetch(`${baseUrl}/api/v1/workflows`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
        }

        console.log(
            "[CHECKPOINT 6] n8n API response status:",
            res.status,
            res.statusText,
        );

        if (!res.ok) {
            const text = await res.text();
            console.log("[ERROR] n8n API error:", res.status, text);
            throw new Error(`N8N API Error (${res.status}): ${text}`);
        }
        const data = await res.json();
        console.log(
            "[CHECKPOINT 7] n8n response data:",
            JSON.stringify(
                {
                    id: data.id,
                    name: data.name,
                    nodeCount: data.nodes?.length,
                    hasWebhook: data.nodes?.some(
                        (n: any) => n.type === "n8n-nodes-base.webhook",
                    ),
                },
                null,
                2,
            ),
        );

        const hasWebhookNode = data.nodes?.some(
            (node: any) => node.type === "n8n-nodes-base.webhook",
        );
        const webhookNode = data.nodes?.find(
            (node: any) => node.type === "n8n-nodes-base.webhook",
        );
        const webhookPath = webhookNode?.parameters?.path ?? null;
        console.log(
            "[CHECKPOINT 8] webhookPath:",
            webhookPath,
            "hasWebhookNode:",
            hasWebhookNode,
        );

        createdWorkflowId = data.id;
        if (!data || !createdWorkflowId) {
            console.log("[ERROR] Missing workflow id in n8n response");
            throw new Error(
                `N8N workflow creation error: ${JSON.stringify(data)}`,
            );
        }
        if (hasWebhookNode && !webhookPath) {
            console.log("[ERROR] Webhook node present but missing path");
            throw new Error("Webhook node is missing the path parameter");
        }

        // Deactivate before updating if this is a re-deploy
        if (workflow?.n8nWorkflowId) {
            console.log(
                "[CHECKPOINT 8b] Deactivating existing workflow before update",
            );
            await fetch(
                `${baseUrl}/api/v1/workflows/${workflow.n8nWorkflowId}/deactivate`,
                { method: "POST", headers, signal: controller.signal },
            ).catch(() =>
                console.log(
                    "[INFO] Deactivate skipped — maybe already inactive",
                ),
            );
        }

        console.log("[CHECKPOINT 9] Activating workflow:", createdWorkflowId);
        const activateRes = await fetch(
            `${baseUrl}/api/v1/workflows/${createdWorkflowId}/activate`,
            {
                method: "POST",
                headers,
                signal: controller.signal,
            },
        );
        console.log(
            "[CHECKPOINT 10] Activation response:",
            activateRes.status,
            activateRes.statusText,
        );
        if (!activateRes.ok) {
            const activateResText = await activateRes.text();
            console.log("[ERROR] Activation failed:", activateResText);
            throw new Error("Activation failed" + activateResText);
        }
        console.log("[CHECKPOINT 11] Updating DB record:", id);
        const toolSchema = buildToolSchema(
            workflow.workflowJson as WorkflowGraphData
        );
        await prisma.workflow.update({
            where: { id },
            data: {
                n8nWorkflowId: createdWorkflowId,
                n8nWorkflowJson: data,
                n8nWebhookUrl: webhookPath
                    ? `${baseUrl}/webhook/${webhookPath}`
                    : null,
                status: "ACTIVE",
                toolSchema: toolSchema as unknown as Prisma.InputJsonValue
            },
        });
        // Create WorkflowVersion record for history
        const latestVersion = await prisma.workflowVersion.findFirst({
            where: { workflowId: id },
            orderBy: { version: "desc" },
        });
        await prisma.workflowVersion.create({
            data: {
                workflowId: id,
                version: (latestVersion?.version ?? 0) + 1,
                workflowJson: (workflow?.workflowJson as any) ?? {},
            },
        });
        console.log("[CHECKPOINT 12] Workflow deployment complete!");
    } catch (error) {
        console.log(
            "[ERROR] Caught in addWorkflowToN8n:",
            error instanceof Error ? error.message : error,
        );
        if (!workflow?.n8nWorkflowId && createdWorkflowId) {
            console.log(
                "[CLEANUP] Deleting newly created n8n workflow:",
                createdWorkflowId,
            );
            await fetch(`${baseUrl}/api/v1/workflows/${createdWorkflowId}`, {
                method: "DELETE",
                headers,
                signal: controller.signal,
            });
        }

        throw error;
    } finally {
        clearTimeout(timeout);
        console.log("[CHECKPOINT 13] addWorkflowToN8n finished");
    }
}

// const r =
// {
//     updatedAt: '2026-06-05T12:19:59.373Z',
//     createdAt: '2026-06-05T12:19:59.373Z',
//     id: 'yP8ts0yozqp30Sv4', name: 'Frontend Test Workflow',
//     description: null, active: false, isArchived: false,
//     nodes: [{
//         id: 'webhook-node', name: 'Webhook', type: 'n8n-nodes-base.webhook',
//         typeVersion: 2, position: [Array], parameters: [Object],
//         webhookId: 'bd6625da-e2aa-4d7b-8935-01084cafe0f1'
//     },
//     {
//         id: 'response-node', name: 'Respond',
//         type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1,
//         position: [Array], parameters: [Object]
//     }],
//     connections: { Webhook: { main: [Array] } },
//     settings: {}, staticData: null, meta: null,
//     nodeGroups: [], pinData: null,
//     versionId: '774ff930-b00d-4d08-91db-3dced664b422',
//     activeVersionId: null, versionCounter: 1,
//     triggerCount: 0, shared: [
//         {
//             updatedAt: '2026-06-05T12:19:59.379Z',
//             createdAt: '2026-06-05T12:19:59.379Z',
//             role: 'workflow:owner', workflowId: 'yP8ts0yozqp30Sv4',
//             projectId: '8H6PZwSXUXKmy4zw', project: [Object]
//         }],
//     tags: [], parentFolder: null,
//     activeVersion: null
// }
