"use server";

import { getUser } from "@/app/(auth)/login/action";
import { GROQ_MODEL } from "@/lib/ai/llm";
import { buildWorkflowPrompt } from "@/lib/ai/prompt";
import { getDbTools } from "@/app/(dashboard)/tools/action";
import prisma from "@/lib/prisma";
import { WorkflowGenerationFormData } from "@/lib/validators";
import { groq } from "@ai-sdk/groq";
import { Prisma } from "@/lib/generated/prisma/client";
import { generateText, Output } from "ai";
import { revalidateTag } from "next/cache";
import z from "zod";
import {
    NodeType,
    WorkflowGraphData,
    WorkflowGraphSchema,
} from "../workflow.schema";
import { ParsedSchema, Workflow } from "@/lib/types";
import { getCapabilites } from "./[schemaId]/[capabilityId]/page";
import { buildSchemaSummary } from "@/lib/workflow/buildSchema";

// export type WorkflowGraphData = z.infer<typeof WorkflowGraphSchema>;
export type GeneratedWorkflow = Workflow & WorkflowGraphData;

type GenerateWorkflowInput = WorkflowGenerationFormData & {
    schemaId: string;
    capabilityId: string;
};

export async function generateWorkFlow(
    input: GenerateWorkflowInput,
): Promise<GeneratedWorkflow> {
    console.log("[GENERATE CHECKPOINT 1] generateWorkFlow called", {
        name: input.name,
        schemaId: input.schemaId,
        capabilityId: input.capabilityId,
    });
    const user = await getUser();

    if (!user?.id) {
        console.log("[GENERATE ERROR] No user id found");
        throw new Error("No user id found!");
    }
    console.log("[GENERATE CHECKPOINT 2] User authenticated:", user.id);

    const name = input.name.trim();
    if (!name) {
        console.log("[GENERATE ERROR] Workflow name is required");
        throw new Error("Workflow name is required.");
    }

    const capability = await getCapabilites(input.schemaId, input.capabilityId);
    // New API/Workflow metadata separation logic
    // const capability = await prisma.capability.findUnique({
    //     where: { id: input.capabilityId },
    // });
    if (!capability) {
        throw new Error("Capability not found");
    }

    // Stable identifier
    const workflowName = capability.id;
    // Endpoint from capability
    const endpoint = capability.suggestedEndpoint;
    const httpMethod = capability.suggestedMethod;

    const workflowOptionsJson: Prisma.InputJsonValue = {
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
        console.log(
            "[GENERATE CHECKPOINT 3] Calling LLM (Groq) for workflow generation",
        );
        const uploadedSchema = await prisma.uploadedSchema.findUnique({
            where: { id: input.schemaId },
            select: {
                parsedJson: true,
            },
        });

        if (!uploadedSchema?.parsedJson) {
            throw new Error("Schema not found");
        }

        const parsedSchema =
            uploadedSchema.parsedJson as unknown as ParsedSchema;

        const schemaSummary = buildSchemaSummary(parsedSchema);
        // const dbTools = await getDbTools();
        const prompt = buildWorkflowPrompt(
            workflowOptionsJson,
            {
                id: capability.id,
                name: capability.name,
                description: capability.description || "",
                category: capability.category,
                suggestedMethod: capability.suggestedMethod,
                suggestedEndpoint: capability.suggestedEndpoint,
                entities: capability.entities,
            },
            schemaSummary,
            NodeType.options,
        );
        console.log("==================================");
        console.log("prompt");
        console.log("==================================");
        console.log(prompt);
        console.log("==================================");
        const llmPromise = generateText({
            model: groq(GROQ_MODEL),
            output: Output.json(WorkflowGraphSchema),
            prompt: prompt,
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(
                () => reject(new Error("LLM request timed out after 30s")),
                30000,
            ),
        );
        const { text } = await Promise.race([llmPromise, timeoutPromise]);

        const parsedGraph = JSON.parse(text) as z.infer<typeof WorkflowGraphSchema>;
        const normalizedGraph = normalizeGeneratedGraph(
            parsedGraph,
            capability.suggestedEndpoint,
            capability.suggestedMethod,
        );
        assertNodePortsByType(normalizedGraph);
        generatedGraph = normalizedGraph;

        console.log("[GENERATE CHECKPOINT 5] Parsed graph:", {
            nodeCount: generatedGraph.graph?.nodes?.length,
            edgeCount: generatedGraph.graph?.edges?.length,
        });
    } catch (error) {
        workflowErr = error instanceof Error ? error : new Error(String(error));
        console.log("[GENERATE ERROR] LLM/parse failed:", workflowErr.message);
    }

    function assertNodePortsByType(graph: z.infer<typeof WorkflowGraphSchema>): void {
        const requiredOutputs: Record<string, string[]> = {
            webhook: ["output0"],
            validation: ["output0", "output1"],
            database: ["output0", "output1"],
            condition: ["output0", "output1"],
            transform: ["output0"],
            merge: ["output0"],
            response: [],
            error: [],
        };

        for (const node of graph.graph.nodes) {
            const expected = requiredOutputs[node.type] ?? [];
            const actual = new Set((node.outputs ?? []).map((output) => output.id));
            for (const expectedId of expected) {
                if (!actual.has(expectedId)) {
                    throw new Error(
                        `${node.label} (${node.type}) is missing output "${expectedId}".`,
                    );
                }
            }
        }
    }

    function normalizeGeneratedGraph(
        graph: z.infer<typeof WorkflowGraphSchema>,
        suggestedEndpoint: string,
        suggestedMethod: string,
    ): z.infer<typeof WorkflowGraphSchema> {
        const normalizedEndpoint = suggestedEndpoint
            .replace(/^\/+|\/+$/g, "")
            .trim();
        const normalizedMethod = suggestedMethod.toUpperCase();

        const nodeIoByType: Record<
            string,
            {
                inputs: Array<{ id: string; name: string; type: string }>;
                outputs: Array<{ id: string; name: string; type: string }>;
            }
        > = {
            webhook: {
                inputs: [],
                outputs: [{ id: "output0", name: "next", type: "object" }],
            },
            validation: {
                inputs: [{ id: "input0", name: "input", type: "object" }],
                outputs: [
                    { id: "output0", name: "true", type: "boolean" },
                    { id: "output1", name: "false", type: "boolean" },
                ],
            },
            database: {
                inputs: [{ id: "input0", name: "input", type: "object" }],
                outputs: [
                    { id: "output0", name: "success", type: "object" },
                    { id: "output1", name: "error", type: "object" },
                ],
            },
            condition: {
                inputs: [{ id: "input0", name: "input", type: "object" }],
                outputs: [
                    { id: "output0", name: "true", type: "boolean" },
                    { id: "output1", name: "false", type: "boolean" },
                ],
            },
            transform: {
                inputs: [{ id: "input0", name: "input", type: "object" }],
                outputs: [{ id: "output0", name: "next", type: "object" }],
            },
            merge: {
                inputs: [
                    { id: "input0", name: "left", type: "object" },
                    { id: "input1", name: "right", type: "object" },
                ],
                outputs: [{ id: "output0", name: "next", type: "object" }],
            },
            response: {
                inputs: [{ id: "input0", name: "input", type: "object" }],
                outputs: [],
            },
            error: {
                inputs: [{ id: "input0", name: "input", type: "object" }],
                outputs: [],
            },
        };

        const normalizedNodesRaw = graph.graph.nodes.map((node) => {
            const io = nodeIoByType[node.type];
            const normalizedNode = io
                ? {
                      ...node,
                      inputs: io.inputs,
                      outputs: io.outputs,
                  }
                : node;

            if (normalizedNode.type !== "webhook") return normalizedNode;

            const currentConfig = (normalizedNode.config ?? {}) as Record<
                string,
                unknown
            >;
            const currentPath =
                typeof currentConfig.path === "string"
                    ? currentConfig.path.replace(/^\/+|\/+$/g, "").trim()
                    : "";
            const path = currentPath || normalizedEndpoint || "webhook";
            const method =
                typeof currentConfig.method === "string"
                    ? currentConfig.method.toUpperCase()
                    : normalizedMethod || "GET";

            return {
                ...normalizedNode,
                config: {
                    ...currentConfig,
                    path,
                    method,
                },
            };
        });
        const normalizedNodes = ensureUniqueNodeLabels(normalizedNodesRaw);

        const nodeById = new Map(normalizedNodes.map((node) => [node.id, node]));

        const outgoingOrder = new Map<string, number>();
        const normalizedEdges = graph.graph.edges.map((edge) => {
            const sourceNode = nodeById.get(edge.source);
            if (!sourceNode) return edge;

            const currentIndex = outgoingOrder.get(edge.source) ?? 0;
            outgoingOrder.set(edge.source, currentIndex + 1);

            const handle = edge.sourceHandle?.toLowerCase();
            const label = edge.label?.toLowerCase();
            let sourceHandle = "output0";

            if (sourceNode.type === "validation" || sourceNode.type === "condition") {
                if (handle === "false" || handle === "output1") {
                    sourceHandle = "output1";
                } else if (handle === "true" || handle === "output0") {
                    sourceHandle = "output0";
                } else if (
                    label?.includes("false") ||
                    label?.includes("invalid") ||
                    label?.includes("error")
                ) {
                    sourceHandle = "output1";
                } else if (currentIndex > 0) {
                    sourceHandle = "output1";
                }

            } else if (sourceNode.type === "database") {
                if (
                    handle === "output1" ||
                    handle === "error" ||
                    label?.includes("error") ||
                    label?.includes("fail")
                ) {
                    sourceHandle = "output1";
                } else {
                    sourceHandle = "output0";
                }
            }

            return {
                ...edge,
                sourceHandle,
            };
        });

        return {
            ...graph,
            graph: {
                ...graph.graph,
                nodes: normalizedNodes,
                edges: normalizedEdges,
            },
        };
    }
    function ensureUniqueNodeLabels(
        nodes: z.infer<typeof WorkflowGraphSchema>["graph"]["nodes"],
    ): z.infer<typeof WorkflowGraphSchema>["graph"]["nodes"] {
        const seen = new Map<string, number>();

        return nodes.map((node) => {
            const baseLabel = node.label.trim() || node.type;
            const count = seen.get(baseLabel) ?? 0;
            seen.set(baseLabel, count + 1);

            if (count === 0) return { ...node, label: baseLabel };
            return {
                ...node,
                label: `${baseLabel} ${count + 1}`,
            };
        });
    }
    if (!generatedGraph) {
        console.log("[GENERATE ERROR] No graph generated");
        throw workflowErr ?? new Error("Workflow generation failed");
    }
    console.log("[GENERATE CHECKPOINT 6] Upserting workflow to DB");

    // n8n deployment friendly webhook path
    const webhookPath = workflowName.replace(/_/g, "-");

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
            name: workflowName,
            purpose: input.purpose,
            description: input.purpose,
            endpoint: endpoint,
            endpointType: input.endpointType,
            httpMethod: httpMethod,
            generationMode: input.generationMode,
            requiresAuth: input.requiresAuth,
            status: "PENDING_REVIEW",
            ownerId: user.id,
            workflowJson: generatedGraph as Prisma.InputJsonValue,
        },

        update: {
            name: workflowName,
            purpose: input.purpose,
            description: input.purpose,
            endpoint: endpoint,
            endpointType: input.endpointType,
            httpMethod: httpMethod,
            generationMode: input.generationMode,
            requiresAuth: input.requiresAuth,
            status: "PENDING_REVIEW",
            workflowJson: generatedGraph as Prisma.InputJsonValue,
        },
    });
    console.log(
        "[GENERATE CHECKPOINT 7] Workflow upserted, DB id:",
        workflow.id,
    );
    revalidateTag(`get-workflow-${user.id}`, "max");

    console.log("[GENERATE CHECKPOINT 8] Creating WorkflowExecution record");
    await prisma.workflowExecution.create({
        data: {
            workflowId: workflow.id,
            status: workflowErr ? "FAILED" : "SUCCESS",
            latencyMs: 0,
            startedAt: new Date(),
            completedAt: new Date(),
            requestData: workflowOptionsJson,
            responseData: generatedGraph as Prisma.InputJsonValue,
            errorMessage: workflowErr?.message ?? null,
        },
    });
    console.log("[GENERATE CHECKPOINT 9] Done, returning workflow");

    return {
        ...workflow,
        ...(generatedGraph ?? {}),
        name: workflowName, // Ensure returned name is stable
    } as GeneratedWorkflow;
}
