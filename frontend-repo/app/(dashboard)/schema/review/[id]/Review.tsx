'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, { Background, Controls, BackgroundVariant, Node, Edge, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { CheckCircle2, XCircle, RefreshCw, BrainCircuit, Layers, Link2, Lightbulb, ChevronRight, Bot } from 'lucide-react';
// import { schemaService } from '@/lib/api/services';
import { useSchemaStore, useUIStore } from '@/stores';
import { PageHeader, StatusBadge, LoadingSkeleton, EmptyState } from '@/components/ui/UIComponents';
import { Button } from '@/components/ui/Button';
import { formatPercent } from '@/lib/utils';
import styles from '../review.module.css';
import { SchemaEntity, UploadedSchema } from '@/lib/types';
import ERDNode from '@/components/ERDNode';
import { generateReview, ReviewAnalysis } from './action';
import { revalidateGetSchemasById } from '../../action';

const nodeTypes = {
    erd: ERDNode,
};

export default function SchemaReview({ schema }: { schema: UploadedSchema }) {
    const router = useRouter();
    const { addToast } = useUIStore();
    const [activeTab, setActiveTab] = useState<'entities' | 'actions' | 'rules'>('entities');
    const [llmReview, setLlmReview] = useState<ReviewAnalysis | null>(schema.analysisResult as ReviewAnalysis | null);
    const {
        isLoading, setLoading,
        isAnalyzing, setAnalyzing,
    } = useSchemaStore();

    const handleRegenerate = async () => {
        if (!schema) return;
        setAnalyzing(true);
        try {
            const llmResp = await generateReview(
                schema.parsedJson, schema.id, schema.status
            );
            if (!llmResp.success) {
                addToast({ type: 'error', title: 'Analysis refreshed', message: llmResp.error });
                return;
            }
            setLlmReview(llmResp.data);
            addToast({ type: 'success', title: 'Analysis refreshed', message: 'AI re-analyzed your schema.' });
        } catch (error) {
            addToast({ type: 'error', title: 'Analysis Failed', message: 'AI analysys failed.' });
        } finally {
            setAnalyzing(false);
        }
    };

    const handleApprove = () => {
        addToast({ type: 'success', title: 'Schema approved', message: 'Proceeding to workflow generation.' });
        const firstCapability = llmReview?.capabilities?.[0];
        if (firstCapability) {
            router.push(`/workflows/new/${schema.id}/${firstCapability.id}`);
        } else {
            router.push(`/schema/review/${schema.id}`);
        }
    };

    const handleReject = () => {
        addToast({ type: 'info', title: 'Schema rejected', message: 'Please upload a revised schema.' });
        // router.push('/');
        return
    };

    const NODE_WIDTH = 260;
    const H_GAP = 60;
    const V_GAP = 50;
    const HEADER_H = 48;
    const FIELD_ROW_H = 34;

    const estimateHeight = (entity: SchemaEntity) => HEADER_H + (entity.fields.length || 1) * FIELD_ROW_H;

    const cols = Math.max(1, Math.ceil(Math.sqrt(schema.entities.length)));
    const rows = Math.ceil(schema.entities.length / cols);

    const rowMaxHeights = Array.from({ length: rows }, (_, row) =>
        Math.max(
            ...schema.entities
                .slice(row * cols, (row + 1) * cols)
                .map(estimateHeight)
        )
    );

    const rfNodes: Node[] = schema.entities.map((entity, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return {
            id: entity.id,
            type: "erd",
            position: {
                x: col * (NODE_WIDTH + H_GAP),
                y: rowMaxHeights.slice(0, row).reduce((sum, h) => sum + h + V_GAP, 0),
            },
            data: { name: entity.name, fields: entity.fields },
        };
    });


    const edgeMap: Record<string, string> = {
        "one-to-one": "1 : 1",
        "one-to-many": "1 : M",
        "many-to-one": "M : 1",
        "many-to-many": "M : M",
    };

    const edgeColor: Record<string, string> = {
        "one-to-one": "#10b981", // green  — simple 1:1
        "one-to-many": "#00c8f8", // cyan   — fan-out
        "many-to-one": "#f59e0b", // amber  — fan-in
        "many-to-many": "#f43f5e", // rose   — complex
    };

    const hasBothEnds = (type: string) =>
        type === "many-to-many" || type === "many-to-one";

    const rfEdges: Edge[] = schema
        ? schema.relationships.map((rel) => {
            const source = schema.entities.find((e) => e.name === rel.fromEntity);
            const target = schema.entities.find((e) => e.name === rel.toEntity);
            const color = edgeColor[rel.type] ?? "#6366f1";

            return {
                id: `${rel.fromEntity}-${rel.toEntity}-${rel.fieldName}-${rel.type}`,
                source: source?.id ?? rel.fromEntity,
                target: target?.id ?? rel.toEntity,
                label: edgeMap[rel.type] ?? rel.type,
                type: "smoothstep",
                animated: rel.type === "many-to-many",
                style: { stroke: color, strokeWidth: 2 },
                labelStyle: {
                    fill: "#f9fafb",
                    fontSize: 11,
                    fontWeight: 700,
                },
                labelBgStyle: {
                    fill: "#111827",
                    fillOpacity: 0.92,
                },
                labelBgPadding: [6, 4] as [number, number],
                labelBgBorderRadius: 4,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color,
                },
                ...(hasBothEnds(rel.type) && {
                    markerStart: {
                        type: MarkerType.ArrowClosed,
                        color,
                    },
                }),
            };
        })
        : [];

    const refreshSchemasById = async () => {
        setLoading(true);
        try {
            await revalidateGetSchemasById(schema.id);
            router.refresh();
        } finally {
            setLoading(false);
        }
    };
    console.log(JSON.stringify(schema, null, 2));

    return (
        <div className={styles.page}>
            <PageHeader
                title="AI Schema Review"
                description="Review AI-generated understanding of your schema"
                actions={
                    <>
                        <Button variant="secondary" size="sm" leftIcon={<Bot size={14} />} isLoading={isAnalyzing || isLoading} onClick={handleRegenerate}>
                            {schema.status === 'PARSED' ? "Generate Ai Review" : "Regenerate"}
                        </Button>
                        <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />} isLoading={isAnalyzing || isLoading} onClick={refreshSchemasById}>
                            Refresh
                        </Button>
                        <Button variant="danger" size="sm" leftIcon={<XCircle size={14} />} onClick={handleReject}>
                            Reject
                        </Button>
                        <Button variant="success" size="sm" leftIcon={<CheckCircle2 size={14} />} onClick={handleApprove}>
                            Approve & Generate
                        </Button>
                    </>
                }
            />

            {!schema ? (
                <EmptyState
                    icon={<BrainCircuit size={32} />}
                    title="No schema selected"
                    description="Upload and select a schema from the Schema Manager."
                    action={<Button variant="primary" onClick={() => router.push('/schema')}>Go to Schema Manager</Button>}
                />
            ) : (
                <div className={styles.layout}>
                    {/* Left: JSON tree */}
                    <div className={styles.leftPanel}>
                        <div className={styles.panelHeader}>
                            <Layers size={14} />
                            <span>Schema Structure</span>
                            <StatusBadge status={schema.status} size="sm" />
                        </div>

                        {/* Tab switcher */}
                        <div className={styles.tabs}>
                            {(['entities', 'actions', 'rules'] as const).map((tab) => (
                                <button key={tab} className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`} onClick={() => setActiveTab(tab)}>
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'entities' && (
                            <div className={styles.entityTree}>
                                {isLoading ? (
                                    <LoadingSkeleton height={56} count={4} />
                                ) : (
                                    schema.entities.map((entity) => (   // ✅ schema.entities directly
                                        <div key={entity.id + entity.name} className={styles.entityNode}>
                                            <div className={styles.entityNodeHeader}>
                                                <span className={styles.entityNodeName}>{entity.name}</span>
                                                <span className={styles.entityNodeCount}>{entity.fields.length} fields</span>
                                            </div>
                                            <div className={styles.fieldList}>
                                                {entity.fields.slice(0, 4).map((f) => (   // ✅ f is SchemaField — no implicit any
                                                    <div key={f.name} className={styles.fieldItem}>
                                                        <span className={styles.fieldName}>{f.name}</span>
                                                        <span className={styles.fieldType}>{f.type}</span>
                                                        <div className={styles.fieldFlags}>
                                                            {f.isPrimary && <span className={styles.flag} style={{ color: 'var(--color-warning)' }}>PK</span>}
                                                            {f.isForeign && <span className={styles.flag} style={{ color: 'var(--color-info)' }}>FK</span>}
                                                            {f.isRequired && <span className={styles.flag} style={{ color: 'var(--color-error)' }}>!</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                                {entity.fields.length > 4 && (
                                                    <span className={styles.moreFields}>+{entity.fields.length - 4} more fields</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'actions' && (
                            <div className={styles.actionList}>
                                {isAnalyzing ? <LoadingSkeleton count={5} /> : <>
                                    {!llmReview?.capabilities?.length && <p>Generate AI review</p>}
                                    {llmReview?.capabilities?.map((action) => (
                                        <div key={action.id} className={styles.actionItem}>
                                            <div className={styles.actionHeader}>
                                                <span className={styles.actionName}>{action.name}</span>
                                                <span className={styles.confidence}>{formatPercent(action.confidence * 100, 0)}</span>
                                            </div>
                                            <p className={styles.actionDesc}>{action.description}</p>
                                            <div className={styles.actionEntities}>
                                                {action.entities.map((e) => <span key={e} className={styles.entityPill}>{e}</span>)}
                                            </div>
                                            <button className={styles.generateBtn} onClick={() => router.push(`/workflows/new/${schema.id}/${action.id}`)}>
                                                Generate workflow <ChevronRight size={11} />
                                            </button>
                                        </div>
                                    ))}
                                </>}
                            </div>
                        )}

                        {activeTab === 'rules' && (
                            <div className={styles.ruleList}>
                                {isAnalyzing ? <LoadingSkeleton count={5} /> : <>
                                    {!llmReview?.businessRules?.length && <p>Generate AI review</p>}
                                    {llmReview?.businessRules?.map((rule) => (
                                        <div key={rule.id} className={styles.ruleItem}>
                                            <div className={styles.ruleHeader}>
                                                <Lightbulb size={13} className={styles.ruleIcon} />
                                                <span className={styles.confidence}>{formatPercent(rule.confidence * 100, 0)}</span>
                                            </div>
                                            <p className={styles.ruleText}>{rule.rule}</p>
                                            <div className={styles.actionEntities}>
                                                {rule.entities.map((e) => <span key={e} className={styles.entityPill}>{e}</span>)}
                                            </div>
                                        </div>
                                    ))}
                                </>}
                            </div>
                        )}
                    </div>

                    {/* Center: Relationship graph */}
                    <div className={styles.graphPanel}>
                        <div className={styles.panelHeader}>
                            <Link2 size={14} />
                            <span>Entity Relationship Graph</span>
                            <span className={styles.metaPill}>{schema.relationshipCount} relationships</span>
                        </div>
                        {rfNodes.length > 0 ? (
                            <div className={styles.graphWrap}>
                                <ReactFlow
                                    nodes={rfNodes}
                                    edges={rfEdges}
                                    fitView
                                    fitViewOptions={{ padding: 0.2 }}
                                    nodesDraggable={false}
                                    nodesConnectable={false}
                                    className={styles.flow}
                                    nodeTypes={nodeTypes}
                                    zoomOnScroll={false}
                                    panOnScroll={false}
                                    elementsSelectable={false}
                                >
                                    <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.06)" />
                                    <Controls />
                                </ReactFlow>
                            </div>
                        ) : (
                            <EmptyState
                                title="No entities to display"
                                description="The schema parser did not return any entities."
                            />
                        )}
                    </div>

                    {/* Right: Approval panel */}
                    <div className={styles.rightPanel}>
                        <div className={styles.panelHeader}>
                            <BrainCircuit size={14} />
                            <span>AI Analysis</span>
                        </div>

                        <div className={styles.confidenceCard}>
                            <span className={styles.confidenceLabel}>Overall Confidence</span>
                            <span className={styles.confidenceScore}>{formatPercent((llmReview?.confidence ?? 0) * 100, 0)}</span>
                            <div className={styles.confidenceBar}>
                                <div className={styles.confidenceFill} style={{ width: '96%' }} />
                            </div>
                        </div>

                        <div className={styles.summaryCard}>
                            <h4 className={styles.summaryTitle}>Summary</h4>
                            <div className={styles.summaryText}>
                                {llmReview?.summary ?? "Generate AI review"}
                            </div>
                            <div className={styles.summaryGrid}>
                                <div className={styles.summaryItem}><span className={styles.summaryVal}>{schema.entityCount}</span><span className={styles.summaryKey}>Entities</span></div>
                                <div className={styles.summaryItem}><span className={styles.summaryVal}>{schema.relationshipCount}</span><span className={styles.summaryKey}>Relations</span></div>
                                <div className={styles.summaryItem}><span className={styles.summaryVal}>{llmReview?.capabilities?.length ?? 0}</span><span className={styles.summaryKey}>Actions</span></div>
                                <div className={styles.summaryItem}><span className={styles.summaryVal}>{llmReview?.businessRules?.length ?? 0}</span><span className={styles.summaryKey}>Rules</span></div>
                            </div>
                        </div>

                        <div className={styles.suggestions}>
                            <h4 className={styles.sugTitle}>AI Suggestions</h4>
                            {!llmReview?.suggestions?.length && <p>Generate AI review</p>}
                            <ul className={styles.sugList}>
                                {llmReview?.suggestions?.map((s, i) => (
                                    <li className={styles.suggestions} key={s.title + i}>
                                        <h5 className={styles.sugTitle}>{s.title}</h5>
                                        <code>{s.priority}</code>
                                        <p>{s.reason}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className={styles.approvalActions}>
                            <Button variant="danger" fullWidth leftIcon={<XCircle size={14} />} onClick={handleReject}>
                                Reject Schema
                            </Button>
                            <Button variant="success" fullWidth leftIcon={<CheckCircle2 size={14} />} onClick={handleApprove}>
                                Approve & Continue
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
