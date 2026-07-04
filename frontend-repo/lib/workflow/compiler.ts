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
import { mapGeneric, ToolRecord } from "./mappers";
import { WorkflowEdge, WorkflowGraphData, WorkflowNode } from "@/app/(dashboard)/workflows/workflow.schema";

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function graphToN8n(ir: WorkflowGraphData, tools: ToolRecord[]): CompileResult {
    console.log('[COMPILER CHECKPOINT 1] graphToN8n called, ir.id:', ir?.id, 'ir.description:', ir?.description);
    const warnings: string[] = [];
    const errors: string[] = [];

    // ── 1. Validate IR structure ───────────────────────────────────────────────
    const validationErrors = validateIR(ir);
    if (validationErrors.length > 0) {
        console.log('[COMPILER ERROR] Validation failed:', validationErrors);
        return { success: false, errors: validationErrors };
    }
    console.log('[COMPILER CHECKPOINT 2] IR validation passed');

    const { graph, id, description } = ir;
    console.log('[COMPILER CHECKPOINT 3] Nodes:', graph.nodes.length, 'Edges:', graph.edges.length);

    // ── 2. Compile nodes ───────────────────────────────────────────────────────
    const n8nNodes: N8nNode[] = [];
    const nodeIdToLabel = new Map<string, string>();
    const toolsByName = new Map(tools.map((t) => [t.name, t]));

    for (const node of graph.nodes) {
        const tool = toolsByName.get(node.type);

        if (!tool) {
            console.log('[COMPILER WARN] No tool found for node type:', node.type, 'on node:', node.id);
            errors.push(`Unknown node type "${node.type}" on node "${node.id}"`);
            continue;
        }

        try {
            const mapped = mapGeneric(node, tool);
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
            console.log('[COMPILER ERROR] Mapping failed for node:', node.id, err);
            errors.push(
                `Failed to map node "${node.id}": ${err instanceof Error ? err.message : String(err)}`
            );
        }
    }

    if (errors.length > 0) {
        console.log('[COMPILER ERROR] Compilation errors:', errors);
        return { success: false, errors };
    }
    console.log('[COMPILER CHECKPOINT 4] Compiled', n8nNodes.length, 'n8n nodes');

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

    if (warnings.length > 0) console.log('[COMPILER WARN] Warnings:', warnings);

    // ── 4. Build connection graph ─────────────────────────────────────────────
    const connections = buildConnections(graph.nodes, graph.edges, nodeIdToLabel, warnings);
    console.log('[COMPILER CHECKPOINT 5] Connections built for', Object.keys(connections).length, 'sources');

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
    console.log('[COMPILER CHECKPOINT 6] Workflow assembled, returning success');

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