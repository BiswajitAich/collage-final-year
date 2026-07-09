import { z } from "zod";

export const PortSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
});

export const NodePositionSchema = z.object({
    x: z.number(),
    y: z.number(),
});

export const NodeConfigSchema = z.record(z.string(), z.any());

export const NodeType = z.enum([
    "webhook",
    "validation",
    "database",
    "response",
    "transform",
    "error",
    "condition",
    "merge",
]);
export const NodeSchema = z.object({
    id: z.string(),
    type: NodeType,
    label: z.string(),
    description: z.string().optional().default(""),
    position: NodePositionSchema,
    inputs: z.array(PortSchema).optional().default([]),
    outputs: z.array(PortSchema).optional().default([]),
    config: NodeConfigSchema.optional().default({}),
});

export const EdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional(),
    label: z.string().optional(),
});

export const HttpMethod = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);
export const EndpointType = z.enum(["REST", "WEBHOOK"]);
export const WorkflowGraphSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional().default(""),
    httpMethod: HttpMethod.optional().default("GET"),
    endpointType: EndpointType.optional().default("REST"),
    graph: z.object({
        nodes: z.array(NodeSchema),
        edges: z.array(EdgeSchema),
    }),
});

export type NodeType = z.infer<typeof NodeType>;
export type HttpMethod = z.infer<typeof HttpMethod>;
export type EndpointType = z.infer<typeof EndpointType>;
export type WorkflowGraphData = z.infer<typeof WorkflowGraphSchema>;
export type WorkflowNode = z.infer<typeof NodeSchema>;
export type WorkflowEdge = z.infer<typeof EdgeSchema>;
