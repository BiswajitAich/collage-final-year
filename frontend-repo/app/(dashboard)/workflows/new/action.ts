'use server';

import { getUser } from "@/app/(auth)/login/action";
import { GROQ_MODEL } from "@/lib/ai/llm";
import { buildWorkflowPrompt } from "@/lib/ai/prompt";
import { getDbTools } from "@/app/(dashboard)/tools/action";
import prisma from "@/lib/prisma";
import { WorkflowGenerationFormData } from "@/lib/validators";
import { groq } from "@ai-sdk/groq";
import { Prisma } from '@/lib/generated/prisma/client';
import { generateText, Output } from "ai";
import { revalidateTag } from "next/cache";
import z from "zod";
import { WorkflowGraphData, WorkflowGraphSchema } from "../workflow.schema";
import { Workflow } from "@/lib/types";



// export type WorkflowGraphData = z.infer<typeof WorkflowGraphSchema>;
export type GeneratedWorkflow = Workflow & WorkflowGraphData;

type GenerateWorkflowInput = WorkflowGenerationFormData & {
    schemaId: string;
    capabilityId: string;
};

export async function generateWorkFlow(
    input: GenerateWorkflowInput
): Promise<GeneratedWorkflow> {
    console.log('[GENERATE CHECKPOINT 1] generateWorkFlow called', { name: input.name, schemaId: input.schemaId, capabilityId: input.capabilityId });
    const user = await getUser();

    if (!user?.id) {
        console.log('[GENERATE ERROR] No user id found');
        throw new Error('No user id found!');
    }
    console.log('[GENERATE CHECKPOINT 2] User authenticated:', user.id);

    const name = input.name.trim();
    if (!name) {
        console.log('[GENERATE ERROR] Workflow name is required');
        throw new Error('Workflow name is required.');
    }

    const endpoint = `/${name.toLowerCase().replace(/\s+/g, '-')}`;

    const workflowJson: Prisma.InputJsonValue = {
        entities: input.entities,
        options: {
            readOnly: input.isReadOnly,
            crud: input.enableCRUD,
            strictValidation: input.strictValidation,
            approval: input.requiresApproval,
        },
    };

    let workflowErr: Error | null = null;
    let generatedGraph: z.infer<typeof WorkflowGraphSchema> | null = null;

    try {
        console.log('[GENERATE CHECKPOINT 3] Calling LLM (Groq) for workflow generation');
        const dbTools = await getDbTools();
        const llmPromise = generateText({
            model: groq(GROQ_MODEL),
            output: Output.json(WorkflowGraphSchema),
            prompt: buildWorkflowPrompt(workflowJson, dbTools.map(t => t.name)),
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('LLM request timed out after 30s')), 30000)
        );
        const { text } = await Promise.race([llmPromise, timeoutPromise]);
        console.log('[GENERATE CHECKPOINT 4] LLM response received, length:', text.length);
        generatedGraph = JSON.parse(text) as z.infer<typeof WorkflowGraphSchema>;
        console.log('[GENERATE CHECKPOINT 5] Parsed graph:', {
            id: generatedGraph.id,
            description: generatedGraph.description,
            nodeCount: generatedGraph.graph?.nodes?.length,
            edgeCount: generatedGraph.graph?.edges?.length,
        });
    } catch (error) {
        workflowErr = error instanceof Error ? error : new Error(String(error));
        console.log('[GENERATE ERROR] LLM/parse failed:', workflowErr.message);
    }
    if (!generatedGraph) {
        console.log('[GENERATE ERROR] No graph generated');
        throw workflowErr ?? new Error("Workflow generation failed");
    }
    console.log('[GENERATE CHECKPOINT 6] Upserting workflow to DB');
    const workflow = await prisma.workflow.upsert({
        where: {
            schemaId_capabilityId: {
                schemaId: input.schemaId,
                capabilityId: input.capabilityId,
            },
        },

        create: {
            schemaId: input.schemaId,
            capabilityId: input.capabilityId,
            name,
            purpose: input.purpose,
            description: input.purpose,
            endpoint,
            endpointType: input.endpointType,
            httpMethod: input.httpMethod,
            generationMode: input.generationMode,
            requiresAuth: input.requiresAuth,
            status: "PENDING_REVIEW",
            ownerId: user.id,
            workflowJson: generatedGraph as Prisma.InputJsonValue,
        },

        update: {
            name,
            purpose: input.purpose,
            description: input.purpose,
            endpoint,
            endpointType: input.endpointType,
            httpMethod: input.httpMethod,
            generationMode: input.generationMode,
            requiresAuth: input.requiresAuth,
            status: "PENDING_REVIEW",
            workflowJson: generatedGraph as Prisma.InputJsonValue,
        },
    });
    console.log('[GENERATE CHECKPOINT 7] Workflow upserted, DB id:', workflow.id);
    revalidateTag(`get-workflow-${user.id}`, "max");

    console.log('[GENERATE CHECKPOINT 8] Creating WorkflowExecution record');
    await prisma.workflowExecution.create({
        data: {
            workflowId: workflow.id,
            status: workflowErr ? 'FAILED' : 'SUCCESS',
            latencyMs: 0,
            startedAt: new Date(),
            completedAt: new Date(),
            requestData: workflowJson,
            responseData: generatedGraph as Prisma.InputJsonValue,
            errorMessage: workflowErr?.message ?? null,
        },
    });
    console.log('[GENERATE CHECKPOINT 9] Done, returning workflow');

    return {
        ...workflow,
        ...(generatedGraph ?? {}),
    } as GeneratedWorkflow;
}
