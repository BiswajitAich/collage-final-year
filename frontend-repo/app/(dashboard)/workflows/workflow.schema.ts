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
    "api-call",
    "response",
    "error",
    "trigger",
    "transform",
    "condition",
    "business-logic",
    "loop",
    "merge",
])
export const NodeSchema = z.object({
    id: z.string(),
    type: NodeType,
    label: z.string(),
    description: z.string(),
    position: NodePositionSchema,
    inputs: z.array(PortSchema),
    outputs: z.array(PortSchema),
    config: NodeConfigSchema,
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
    id: z.string(),
    name: z.string(),
    description: z.string(),
    httpMethod: HttpMethod,
    endpointType: EndpointType,
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