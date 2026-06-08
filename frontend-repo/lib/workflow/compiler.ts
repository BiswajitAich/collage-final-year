// ─── Workflow Compiler ────────────────────────────────────────────────────────
import type {
    //   WorkflowIR,
    //   WorkflowNode,
    // WorkflowEdge,
    CompileResult,
} from "./types";
import type {
    N8nWorkflow,
    N8nNode,
    N8nConnections,
    N8nConnectionPorts,
    N8nConnectionTarget,
} from "./n8n-types";
import { NODE_MAPPERS } from "./mappers";
import { WorkflowEdge, WorkflowGraphData, WorkflowNode } from "@/app/(dashboard)/workflows/workflow.schema";

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function graphToN8n(ir: WorkflowGraphData): CompileResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // ── 1. Validate IR structure ───────────────────────────────────────────────
    const validationErrors = validateIR(ir);
    if (validationErrors.length > 0) {
        return { success: false, errors: validationErrors };
    }

    const { graph, id, description } = ir;

    // ── 2. Compile nodes ───────────────────────────────────────────────────────
    const n8nNodes: N8nNode[] = [];
    const nodeIdToLabel = new Map<string, string>();

    for (const node of graph.nodes) {
        const mapper = NODE_MAPPERS[node.type];

        if (!mapper) {
            errors.push(`Unknown node type "${node.type}" on node "${node.id}"`);
            continue;
        }

        try {
            const mapped = mapper(node);
            const n8nNode: N8nNode = {
                id: crypto.randomUUID(),
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
                `Failed to map node "${node.id}": ${err instanceof Error ? err.message : String(err)}`
            );
        }
    }

    if (errors.length > 0) return { success: false, errors };

    // ── 3. Warn on detached nodes ──────────────────────────────────────────────
    const connectedIds = new Set<string>();
    for (const edge of graph.edges) {
        connectedIds.add(edge.source);
        connectedIds.add(edge.target);
    }

    for (const node of graph.nodes) {
        if (!connectedIds.has(node.id) && graph.nodes.length > 1) {
            warnings.push(
                `Node "${node.id}" (${node.label}) has no edges — it will be orphaned in n8n`
            );
        }
    }

    // ── 4. Build connection graph ─────────────────────────────────────────────
    const connections = buildConnections(graph.nodes, graph.edges, nodeIdToLabel, warnings);

    // ── 5. Assemble final workflow ─────────────────────────────────────────────
    const workflow: N8nWorkflow = {
        name: description || id || "Compiled Workflow",
        nodes: n8nNodes,
        connections,
        pinData: {},
        active: false,
        settings: { executionOrder: "v1" },
        versionId: crypto.randomUUID(),
        meta: {
            templateCredsSetupCompleted: true,
            instanceId: crypto.randomUUID(),
        },
        id: id || crypto.randomUUID(),
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
    const errors: string[] = [];

    if (!ir || typeof ir !== "object") {
        return ["IR must be a non-null object"];
    }

    if (!ir.graph) errors.push("Missing required field: graph");
    if (!Array.isArray(ir.graph?.nodes)) errors.push("graph.nodes must be an array");
    if (!Array.isArray(ir.graph?.edges)) errors.push("graph.edges must be an array");

    if (errors.length > 0) return errors;

    // Check for duplicate node IDs
    const nodeIds = new Set<string>();
    for (const node of ir.graph.nodes) {
        if (!node.id) { errors.push("Every node must have an id"); continue; }
        if (!node.type) errors.push(`Node "${node.id}" is missing a type`);
        if (!node.label) errors.push(`Node "${node.id}" is missing a label`);
        if (nodeIds.has(node.id)) errors.push(`Duplicate node id: "${node.id}"`);
        nodeIds.add(node.id);
    }

    // Check for duplicate edge IDs and dangling references
    const edgeIds = new Set<string>();
    for (const edge of ir.graph.edges) {
        console.log(
            JSON.stringify(ir.graph.edges, null, 2)
        );
        if (!edge.id) { errors.push("Every edge must have an id"); continue; }
        if (edgeIds.has(edge.id)) errors.push(`Duplicate edge id: "${edge.id}"`);
        edgeIds.add(edge.id);
        if (!nodeIds.has(edge.source))
            errors.push(`Edge "${edge.id}" references unknown source node: "${edge.source}"`);
        if (!nodeIds.has(edge.target))
            errors.push(`Edge "${edge.id}" references unknown target node: "${edge.target}"`);
    }

    return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Connection Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildConnections(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    nodeIdToLabel: Map<string, string>,
    warnings: string[]
): N8nConnections {
    const connections: N8nConnections = {};

    // Group edges by source ID
    const edgesBySource = new Map<string, WorkflowEdge[]>();
    for (const edge of edges) {
        const list = edgesBySource.get(edge.source) ?? [];
        list.push(edge);
        edgesBySource.set(edge.source, list);
    }

    const nodeById = new Map<string, WorkflowNode>(nodes.map((n) => [n.id, n]));

    for (const [sourceId, sourceEdges] of edgesBySource) {
        const sourceLabel = nodeIdToLabel.get(sourceId);
        if (!sourceLabel) {
            warnings.push(`Cannot resolve label for source node id "${sourceId}"`);
            continue;
        }

        const sourceNode = nodeById.get(sourceId);
        const outputPortCount = Math.max(sourceNode?.outputs.length ?? 1, 1);

        const mainPorts: N8nConnectionPorts = Array.from(
            { length: outputPortCount },
            (): N8nConnectionTarget[] => []
        );

        for (const edge of sourceEdges) {
            const targetLabel = nodeIdToLabel.get(edge.target);
            if (!targetLabel) {
                warnings.push(
                    `Edge "${edge.id}": cannot resolve label for target "${edge.target}"`
                );
                continue;
            }

            const port = Number(edge.sourceHandle ?? 0);

            mainPorts[port].push({ node: targetLabel, type: "main", index: 0 });
        }

        connections[sourceLabel] = { main: mainPorts };
    }

    return connections;
}