'use server'

import { getUser } from "@/app/(auth)/login/action"
import prisma from "@/lib/prisma"
import { graphToN8n } from "@/lib/workflow"
import { cacheLife, cacheTag } from "next/cache"
import { WorkflowGraphData } from "./workflow.schema"

export async function cacheHelper(ownerId: string) {
    'use cache'
    cacheLife('hours');
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
    })
}
export async function getWorkFlows() {
    const user = await getUser();
    if (!user?.id) { return null; }
    return await cacheHelper(user.id);
}
export async function addWorkflowToN8n(id: string) {
    if (!id) {
        throw new Error("Id not received!")
    }
    const n8nUrl = process.env.N8N_URL;
    if (!n8nUrl) {
        throw new Error("n8n url incorrect!");
    }
    const baseUrl = n8nUrl.replace(/\/$/, "");
    const headers = {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": process.env.N8N_API_KEY!,
    }
    let res = null;
    let createdWorkflowId = null;
    let workflow = null;
    const controller = new AbortController();
    const timeout = setTimeout(
        () => controller.abort(),
        30000
    );
    try {
        workflow = await prisma.workflow.findUnique({
            where: { id },
            select: { workflowJson: true, n8nWorkflowId: true }
        });
        console.log("workflow\n\n\n", JSON.stringify(workflow, null, 2));

        if (!workflow?.workflowJson) {
            throw new Error('workflow?.workflowJson mismatch!')
        }
        const compiled = graphToN8n(
            workflow.workflowJson as WorkflowGraphData
        );

        if (!compiled.success || !compiled.workflow) {
            throw new Error(
                compiled.errors?.join(", ") ?? "Compilation failed"
            );
        }
        const payload = {
            name: compiled.workflow.name,
            nodes: compiled.workflow.nodes,
            connections: compiled.workflow.connections,
            settings: compiled.workflow.settings,
        };
        if (workflow?.n8nWorkflowId) {
            res = await fetch(
                `${baseUrl}/api/v1/workflows/${workflow.n8nWorkflowId}`,
                {
                    method: "PUT",
                    headers,
                    body: JSON.stringify(payload),
                    signal: controller.signal
                }
            );
        } else {
            res = await fetch(`${baseUrl}/api/v1/workflows`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });
        }

        if (!res.ok) {
            const text = await res.text();

            throw new Error(
                `N8N API Error (${res.status}): ${text}`
            );
        }
        const data = await res.json();
        const webhookNode = data.nodes?.find(
            (node: any) => node.type === "n8n-nodes-base.webhook"
        );
        const webhookPath = webhookNode?.parameters?.path ?? null;
        console.log(data);

        createdWorkflowId = data.id;
        if (!data || !createdWorkflowId || !webhookPath) {
            throw new Error(`N8N workflow creation error: ${JSON.stringify(data)}`);
        }
        const activateRes = await fetch(
            `${baseUrl}/api/v1/workflows/${createdWorkflowId}/activate`,
            {
                method: "POST",
                headers,
                signal: controller.signal,
            }
        );
        if (!activateRes.ok) {
            const activateResText = await activateRes.text();
            throw new Error("Activation failed" + activateResText);
        }
        await prisma.workflow.update({
            where: { id },
            data: {
                n8nWorkflowId: createdWorkflowId,
                n8nWorkflowJson: data,
                n8nWebhookUrl: webhookPath
                    ? `${baseUrl}/webhook/${webhookPath}`
                    : null,
                status: 'ACTIVE',
            }
        });
    } catch (error) {
        if (!workflow?.n8nWorkflowId && createdWorkflowId) {
            await fetch(
                `${baseUrl}/api/v1/workflows/${createdWorkflowId}`,
                {
                    method: "DELETE",
                    headers,
                    signal: controller.signal
                }
            );
        }

        throw error;
    } finally {
        clearTimeout(timeout);
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