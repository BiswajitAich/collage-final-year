"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Edit3,
    Copy,
    Clock,
    CheckCircle2,
    Activity,
} from "lucide-react";
import { getWorkflowById } from "../new/addWorkflowToN8n.action";
import { useUIStore } from "@/stores";
import {
    StatusBadge,
    LoadingSkeleton,
    ErrorState,
} from "@/components/ui/UIComponents";
import { Button } from "@/components/ui/Button";
import { WorkflowGraph } from "@/components/workflow/WorkflowGraph";
import {
    formatNumber,
    formatPercent,
    formatLatency,
    timeAgo,
} from "@/lib/utils";
import styles from "./workflow-detail.module.css";

export default function WorkflowDetailPage() {
    const params = useParams();
    const router = useRouter();
    const workflowId = params.workflowId as string;
    const { addToast } = useUIStore();
    const [wf, setWf] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            setError("");
            const data = await getWorkflowById(workflowId);
            if (!data) {
                setError("Workflow not found");
                setIsLoading(false);
                return;
            }
            setWf(data);
            setIsLoading(false);
        }
        load();
    }, [workflowId]);

    if (isLoading) return <DetailSkeleton />;
    if (error || !wf)
        return (
            <ErrorState
                title="Workflow not found"
                message={error || "This workflow does not exist."}
                onRetry={() => router.push("/workflows")}
            />
        );

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <button
                    className={styles.backBtn}
                    onClick={() => router.push("/workflows")}
                >
                    <ArrowLeft size={16} /> Workflows
                </button>
                <div className={styles.headerMain}>
                    <div className={styles.titleRow}>
                        <h2 className={styles.title}>{wf.name}</h2>
                        <StatusBadge status={wf.status} />
                    </div>
                    <p className={styles.description}>{wf.description}</p>
                </div>
                <div className={styles.headerActions}>
                    <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Edit3 size={14} />}
                        onClick={() =>
                            router.push(`/workflows/${workflowId}/edit`)
                        }
                    >
                        Edit
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Copy size={14} />}
                        onClick={() =>
                            addToast({
                                type: "success",
                                title: "Duplicated",
                                message: "Workflow copy created.",
                            })
                        }
                    >
                        Duplicate
                    </Button>
                </div>
            </div>

            <div className={styles.grid}>
                {/* Left Column */}
                <div className={styles.leftCol}>
                    {/* Stats */}
                    <div className={styles.statsRow}>
                        {[
                            {
                                label: "Executions",
                                value: formatNumber(wf.executionCount),
                                icon: <Activity size={14} />,
                            },
                            {
                                label: "Success Rate",
                                value: wf.successRate
                                    ? formatPercent(wf.successRate)
                                    : "—",
                                icon: <CheckCircle2 size={14} />,
                            },
                            {
                                label: "Avg Latency",
                                value: wf.avgLatencyMs
                                    ? formatLatency(wf.avgLatencyMs)
                                    : "—",
                                icon: <Clock size={14} />,
                            },
                        ].map((stat) => (
                            <div key={stat.label} className={styles.statCard}>
                                <span className={styles.statIcon}>
                                    {stat.icon}
                                </span>
                                <span className={styles.statValue}>
                                    {stat.value}
                                </span>
                                <span className={styles.statLabel}>
                                    {stat.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Workflow Graph */}
                    <div className={styles.graphCard}>
                        <h3 className={styles.cardTitle}>Workflow Graph</h3>
                        <div className={styles.graphWrap}>
                            <WorkflowGraph
                                nodes={wf.workflowJson?.graph?.nodes ?? []}
                                edges={wf.workflowJson?.graph?.edges ?? []}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className={styles.rightCol}>
                    {/* Endpoint Info */}
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}>Endpoint</h3>
                        <div className={styles.endpointBlock}>
                            <span className={styles.endpointMethod}>
                                {wf.httpMethod}
                            </span>
                            <code className={styles.endpointUrl}>
                                {wf.endpoint}
                            </code>
                            <button
                                className={styles.copyBtn}
                                onClick={() =>
                                    navigator.clipboard.writeText(wf.endpoint)
                                }
                                title="Copy endpoint"
                            >
                                <Copy size={12} />
                            </button>
                        </div>
                        <div className={styles.metaGrid}>
                            <div className={styles.metaItem}>
                                <span className={styles.metaKey}>Type</span>
                                <span className={styles.metaVal}>
                                    {wf.endpointType}
                                </span>
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaKey}>Auth</span>
                                <span className={styles.metaVal}>
                                    {wf.requiresAuth ? "Required" : "Public"}
                                </span>
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaKey}>Mode</span>
                                <span className={styles.metaVal}>
                                    {wf.generationMode}
                                </span>
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaKey}>n8n ID</span>
                                <span className={styles.metaVal}>
                                    {wf.n8nWorkflowId ?? "—"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}>Timeline</h3>
                        <div className={styles.timeline}>
                            <div className={styles.timelineItem}>
                                <span className={styles.timelineDot} />
                                <span className={styles.timelineLabel}>
                                    Created
                                </span>
                                <span className={styles.timelineDate}>
                                    {timeAgo(wf.createdAt)}
                                </span>
                            </div>
                            <div className={styles.timelineItem}>
                                <span className={styles.timelineDot} />
                                <span className={styles.timelineLabel}>
                                    Last updated
                                </span>
                                <span className={styles.timelineDate}>
                                    {timeAgo(wf.updatedAt)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DetailSkeleton() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <LoadingSkeleton height={80} rounded />
            <LoadingSkeleton height={64} count={4} />
            <LoadingSkeleton height={400} rounded />
        </div>
    );
}
