import type {
    //   WorkflowIR,
    //   WorkflowNode,
    // WorkflowEdge,
    CompileResult,
} from "./types";
import type {
    N8nNode,
    N8nConnections,
    N8nConnectionPorts,
    N8nConnectionTarget,
    N8nWorkflowCreate,
} from "./n8n-types";
import { mapGeneric, ToolRecord } from "./mappers";
import {
    WorkflowEdge,
    WorkflowGraphData,
    WorkflowNode,
} from "@/app/(dashboard)/workflows/workflow.schema";
import { ParsedSchema } from "../types";

interface WorkflowDefaults {
    webhookPath: string;
    httpMethod: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function graphToN8n(
    ir: WorkflowGraphData,
    tools: ToolRecord[],
    parsedSchema: ParsedSchema,
): CompileResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // ── 1. Validate IR structure ───────────────────────────────────────────────
    const validationErrors = validateIR(ir);
    if (validationErrors.length > 0) {
        return { success: false, errors: validationErrors };
    }

    const { graph, name, id } = ir;
    const workflowDefaults: WorkflowDefaults = {
        webhookPath: toWebhookPath(id || name || "webhook"),
        httpMethod: ir.httpMethod ?? "GET",
    };

    // ── 2. Compile nodes ───────────────────────────────────────────────────────
    const n8nNodes: N8nNode[] = [];
    const nodeIdToLabel = new Map<string, string>();
    const nodeById = new Map<string, WorkflowNode>(
        graph.nodes.map((n) => [n.id, n]),
    );
    const toolsByName = new Map(tools.map((t) => [t.name, t]));
    const duplicateLabelErrors = getDuplicateLabelErrors(graph.nodes);
    if (duplicateLabelErrors.length > 0) {
        return { success: false, errors: duplicateLabelErrors };
    }
    const topologyErrors = validateNodeTopology(graph.nodes, graph.edges);
    if (topologyErrors.length > 0) {
        return { success: false, errors: topologyErrors };
    }

    for (const node of graph.nodes) {
        const tool = toolsByName.get(node.type);

        if (!tool) {
            errors.push(`Unsupported node type "${node.type}"`);
            continue;
        }

        try {
            const mapped = mapGeneric(
                node,
                tool,
                parsedSchema,
                workflowDefaults,
            );
            const n8nNode: N8nNode = {
                id: node.id,
                name: node.label,
                position: [node.position.x, node.position.y],
                notes: node.description ?? undefined,
                notesInFlow: false,
                ...mapped,
            };

            n8nNodes.push(n8nNode);
            nodeIdToLabel.set(node.id, node.label);
        } catch (err) {
            errors.push(
                `Failed to map node "${node.id}": ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    }

    if (errors.length > 0) {
        return { success: false, errors };
    }

    // ── 3. Warn on detached nodes ──────────────────────────────────────────────
    const connectedIds = new Set<string>();
    for (const edge of graph.edges) {
        connectedIds.add(edge.source);
        connectedIds.add(edge.target);
    }

    for (const node of graph.nodes) {
        if (!connectedIds.has(node.id) && graph.nodes.length > 1) {
            warnings.push(
                `Node "${node.id}" (${node.label}) has no edges — it will be orphaned in n8n`,
            );
        }
    }

    // ── 4. Build connection graph ─────────────────────────────────────────────
    const connections = buildConnections(
        graph.edges,
        nodeIdToLabel,
        nodeById,
        warnings,
    );

    // ── 5. Assemble final workflow ─────────────────────────────────────────────
    const workflow: N8nWorkflowCreate = {
        name: name || id || "Compiled Workflow",
        nodes: n8nNodes,
        connections,
        pinData: {},
        active: false,
        settings: { executionOrder: "v1" },
        tags: [],
    };

    return {
        success: true,
        workflow,
        warnings: warnings.length > 0 ? warnings : undefined,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// IR Validation
// ─────────────────────────────────────────────────────────────────────────────

function validateIR(ir: WorkflowGraphData): string[] {
    if (!Array.isArray(ir.graph?.nodes) || !Array.isArray(ir.graph?.edges)) {
        return ["Invalid workflow graph."];
    }

    const errors: string[] = [];
    const nodeIds = new Set<string>();

    for (const node of ir.graph.nodes) {
        if (!node.id) {
            errors.push("Every node must have an id");
            continue;
        }
        if (!node.type) errors.push(`Node "${node.id}" is missing a type`);
        if (!node.label) errors.push(`Node "${node.id}" is missing a label`);
        if (nodeIds.has(node.id))
            errors.push(`Duplicate node id: "${node.id}"`);
        nodeIds.add(node.id);
    }

    // Check for duplicate edge IDs and dangling references
    const edgeIds = new Set<string>();
    for (const edge of ir.graph.edges) {
        if (!edge.id) {
            errors.push("Every edge must have an id");
            continue;
        }
        if (edgeIds.has(edge.id))
            errors.push(`Duplicate edge id: "${edge.id}"`);
        edgeIds.add(edge.id);
        if (!nodeIds.has(edge.source))
            errors.push(
                `Edge "${edge.id}" references unknown source node: "${edge.source}"`,
            );
        if (!nodeIds.has(edge.target))
            errors.push(
                `Edge "${edge.id}" references unknown target node: "${edge.target}"`,
            );
    }

    return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Connection Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildConnections(
    edges: WorkflowEdge[],
    nodeIdToLabel: Map<string, string>,
    nodeById: Map<string, WorkflowNode>,
    warnings: string[],
): N8nConnections {
    const connections: N8nConnections = {};

    // Group edges by source ID
    const edgesBySource = new Map<string, WorkflowEdge[]>();
    for (const edge of edges) {
        const list = edgesBySource.get(edge.source) ?? [];
        list.push(edge);
        edgesBySource.set(edge.source, list);
    }

    for (const [sourceId, sourceEdges] of edgesBySource) {
        const sourceLabel = nodeIdToLabel.get(sourceId);
        if (!sourceLabel) {
            warnings.push(
                `Cannot resolve label for source node id "${sourceId}"`,
            );
            continue;
        }

        const sourceNode = nodeById.get(sourceId);
        const outputPortCount = Math.max(getOutputPortCount(sourceNode), 1);

        const mainPorts: N8nConnectionPorts = Array.from(
            { length: outputPortCount },
            (): N8nConnectionTarget[] => [],
        );

        for (const edge of sourceEdges) {
            const targetLabel = nodeIdToLabel.get(edge.target);
            if (!targetLabel) {
                warnings.push(
                    `Edge "${edge.id}": cannot resolve label for target "${edge.target}"`,
                );
                continue;
            }

            const port = resolveSourcePort(edge, sourceNode, sourceEdges);
            const boundedPort = Math.min(Math.max(port, 0), mainPorts.length - 1);

            mainPorts[boundedPort].push({
                node: targetLabel,
                type: "main",
                index: 0,
            });
        }

        connections[sourceLabel] = { main: mainPorts };
    }

    return connections;
}

function getDuplicateLabelErrors(nodes: WorkflowNode[]): string[] {
    const labels = new Set<string>();
    const errors: string[] = [];
    for (const node of nodes) {
        if (labels.has(node.label)) {
            errors.push(`Duplicate node label "${node.label}"`);
            continue;
        }
        labels.add(node.label);
    }
    return errors;
}

function validateNodeTopology(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
): string[] {
    const errors: string[] = [];
    const nodeById = new Map<string, WorkflowNode>(nodes.map((n) => [n.id, n]));
    const outEdgesByNode = new Map<string, WorkflowEdge[]>();

    for (const edge of edges) {
        const current = outEdgesByNode.get(edge.source) ?? [];
        current.push(edge);
        outEdgesByNode.set(edge.source, current);
    }

    for (const node of nodes) {
        const outEdges = outEdgesByNode.get(node.id) ?? [];

        if (node.type === "response" || node.type === "error") {
            if (outEdges.length > 0) {
                errors.push(`Node "${node.label}" must be terminal (no outgoing edges).`);
            }
            continue;
        }

        if (node.type === "validation" || node.type === "condition") {
            const outputs = node.outputs ?? [];
            const firstOutput = outputs[0];
            const secondOutput = outputs[1];
            const hasExpectedOutputs =
                outputs.length === 2 &&
                firstOutput?.id === "output0" &&
                secondOutput?.id === "output1";

            if (!hasExpectedOutputs) {
                errors.push(
                    `Node "${node.label}" must define outputs [output0(true), output1(false)].`,
                );
                continue;
            }

            if (outEdges.length !== 2) {
                errors.push(`Node "${node.label}" must have exactly 2 outgoing branches.`);
                continue;
            }

            const branchPorts = new Set(
                outEdges.map((edge) => resolveSourcePort(edge, node, outEdges)),
            );

            if (!branchPorts.has(0) || !branchPorts.has(1)) {
                errors.push(
                    `Node "${node.label}" must define both true (0) and false (1) outputs.`,
                );
            }
            continue;
        }

        if (node.type === "database") {
            if (outEdges.length !== 1) {
                errors.push(
                    `Node "${node.label}" must have exactly 1 outgoing edge (database errors are execution failures).`,
                );
            }
        }

        if (node.type === "webhook" && outEdges.length === 0) {
            errors.push(`Node "${node.label}" must connect to at least one node.`);
        }
    }

    for (const edge of edges) {
        const source = nodeById.get(edge.source);
        const target = nodeById.get(edge.target);
        if (!source || !target) continue;
        if (source.type === "database" && target.type === "error") {
            errors.push(
                `Database node "${source.label}" cannot branch directly to "${target.label}".`,
            );
        }
    }

    return errors;
}

function getOutputPortCount(node?: WorkflowNode): number {
    if (!node) return 1;
    if (node.type === "validation" || node.type === "condition") return 2;
    return Math.max(node.outputs?.length ?? 1, 1);
}

function resolveSourcePort(
    edge: WorkflowEdge,
    sourceNode: WorkflowNode | undefined,
    sourceEdges: WorkflowEdge[],
): number {
    const handle = edge.sourceHandle?.trim().toLowerCase();
    const label = edge.label?.trim().toLowerCase();

    if (handle) {
        if (handle === "true" || handle === "valid" || handle === "success") return 0;
        if (handle === "false" || handle === "invalid" || handle === "error")
            return 1;

        if (/^o\d+$/.test(handle)) {
            const value = Number(handle.slice(1));
            if (Number.isInteger(value) && value > 0) return value - 1;
        }

        if (/^\d+$/.test(handle)) {
            const value = Number(handle);
            if (Number.isInteger(value) && value >= 0) return value;
        }

        const numericMatch = handle.match(/(\d+)/);
        if (numericMatch) {
            const value = Number(numericMatch[1]);
            if (Number.isInteger(value)) {
                return /^o\d+/.test(handle) && value > 0 ? value - 1 : value;
            }
        }
    }

    if (label) {
        if (label.includes("false") || label.includes("invalid") || label.includes("error")) {
            return 1;
        }
        if (label.includes("true") || label.includes("valid") || label.includes("success")) {
            return 0;
        }
    }

    if (sourceNode && (sourceNode.type === "validation" || sourceNode.type === "condition")) {
        const targetIndex = sourceEdges.findIndex((candidate) => candidate.id === edge.id);
        if (targetIndex >= 0) {
            return targetIndex === 0 ? 0 : 1;
        }
    }

    return 0;
}

function toWebhookPath(value: string): string {
    return value
        .trim()
        .replace(/^\/+|\/+$/g, "")
        .replace(/[_\s]+/g, "-")
        .replace(/[^a-zA-Z0-9/-]+/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase() || "webhook";
}
