'use server';

import { getUser } from "@/app/(auth)/login/action";
import { GROQ_MODEL } from "@/lib/ai/llm";
import { buildWorkflowPrompt } from "@/lib/ai/prompt";
import prisma from "@/lib/prisma";
import { WorkflowGenerationFormData } from "@/lib/validators";
import { groq } from "@ai-sdk/groq";
import { Prisma } from '@/lib/generated/prisma/client';
import { generateText, Output } from "ai";
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
    const user = await getUser();

    if (!user?.id) {
        throw new Error('No user id found!');
    }

    const name = input.name.trim();
    if (!name) {
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
        const { text } = await generateText({
            model: groq(GROQ_MODEL),
            output: Output.json(WorkflowGraphSchema),
            prompt: buildWorkflowPrompt(workflowJson),
        });
        generatedGraph = JSON.parse(text) as z.infer<typeof WorkflowGraphSchema>;
    } catch (error) {
        workflowErr = error instanceof Error ? error : new Error(String(error));
    }
    if (!generatedGraph) {
        throw workflowErr ?? new Error("Workflow generation failed");
    }
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

    return {
        ...workflow,
        ...(generatedGraph ?? {}),
    } as GeneratedWorkflow;
}
