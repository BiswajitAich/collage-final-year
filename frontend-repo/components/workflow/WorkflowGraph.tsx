'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  BackgroundVariant,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { X } from 'lucide-react';

import { WORKFLOW_NODE_TYPES } from '@/lib/constants';
import styles from './WorkflowGraph.module.css';
import { WorkflowNode, WorkflowEdge } from '@/app/(dashboard)/workflows/workflow.schema';

function CustomNode({ data }: NodeProps<WorkflowNode>) {
  return (
    <div className={styles.node}>
      <Handle type="target" position={Position.Left} />
      <div className={styles.nodeHeader}>
        <span>{data.label}</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  webhook: CustomNode,
  validation: CustomNode,
  'business-logic': CustomNode,
  database: CustomNode,
  response: CustomNode,
  error: CustomNode,
  transform: CustomNode,
  condition: CustomNode,
};

interface WorkflowGraphProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  readonly?: boolean;
}

export function WorkflowGraph({ nodes, edges, readonly = false }: WorkflowGraphProps) {
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);

  const rfNodes = useMemo<Node[]>(
    () =>
      (nodes ?? []).map((n) => ({
        id: n.id,
        type: n.type,
        position: {
          x: n.position?.x ?? 0,
          y: n.position?.y ?? 0,
        },
        data: n,
      })),
    [nodes]
  );

  const rfEdges = useMemo<Edge[]>(
    () =>
      (edges ?? []).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: e.label,
        type: 'smoothstep',
        animated: false,
        style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5 },
        labelStyle: { fill: 'rgba(255,255,255,0.4)', fontSize: 10 },
        labelBgStyle: { fill: 'transparent' },
      })),
    [edges]
  );

  useEffect(() => {
    setSelectedNode(null);
  }, [nodes, edges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data as WorkflowNode);
  }, []);

  return (
    <div className={styles.container}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        zoomOnScroll={false}
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={!readonly}
        nodesConnectable={!readonly}
        elementsSelectable={!readonly}
        className={styles.flow}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.07)"
        />
        <Controls className={styles.controls} />
        <MiniMap
          className={styles.minimap}
          nodeColor={(n) => {
            const t = (n.data as WorkflowNode)?.type as keyof typeof WORKFLOW_NODE_TYPES;
            return WORKFLOW_NODE_TYPES[t]?.color ?? '#666';
          }}
          maskColor="rgba(8,10,15,0.7)"
        />

        <Panel position="top-right" className={styles.legend}>
          {Object.entries(WORKFLOW_NODE_TYPES).map(([key, val]) => (
            <div key={key} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: val.color }} />
              <span className={styles.legendLabel}>{val.label}</span>
            </div>
          ))}
        </Panel>
      </ReactFlow>

      {selectedNode && (
        <div className={styles.inspector}>
          <div className={styles.inspectorHeader}>
            <span className={styles.inspectorTitle}>Node Inspector</span>
            <button
              type="button"
              className={styles.inspectorClose}
              onClick={() => setSelectedNode(null)}
            >
              <X size={14} />
            </button>
          </div>

          <div className={styles.inspectorBody}>
            <div className={styles.inspectorRow}>
              <span className={styles.inspectorKey}>Type</span>
              <span className={styles.inspectorVal}>{selectedNode.type}</span>
            </div>
            <div className={styles.inspectorRow}>
              <span className={styles.inspectorKey}>Label</span>
              <span className={styles.inspectorVal}>{selectedNode.label}</span>
            </div>
            <div className={styles.inspectorRow}>
              <span className={styles.inspectorKey}>Description</span>
              <span className={styles.inspectorVal}>{selectedNode.description}</span>
            </div>

            {selectedNode.config &&
              Object.entries(selectedNode.config).map(([k, v]) => (
                <div key={k} className={styles.inspectorRow}>
                  <span className={styles.inspectorKey}>{k}</span>
                  <span className={styles.inspectorVal}>{String(v)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}