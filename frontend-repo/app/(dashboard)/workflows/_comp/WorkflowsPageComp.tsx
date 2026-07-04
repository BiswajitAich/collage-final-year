'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, Search, Zap, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { workflowService } from '@/lib/api/services';
import { useWorkflowStore } from '@/stores';
import { PageHeader, StatusBadge } from '@/components/ui/UIComponents';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { formatNumber, formatPercent, formatLatency, timeAgo, formatDate } from '@/lib/utils';
import type { TableColumn } from '@/lib/types';
import styles from '../workflows.module.css';

type StatusFilter = 'ALL' | 'ACTIVE' | 'PENDING_REVIEW' | 'DRAFT' | 'FAILED' | 'INACTIVE';
export type WorkflowListDTO = {
    id: string;
    name: string;
    description: string | null;
    status: string;
    endpoint: string;
    httpMethod: string;
    executionCount: number;
    successRate: number;
    avgLatencyMs: number;
    updatedAt: Date;
};

export default function WorkflowsPageComp({ workflowsData }: { workflowsData: WorkflowListDTO[] | null }) {
    const router = useRouter();
    const isLoading = useWorkflowStore(s => s.isLoading);
    const setLoading = useWorkflowStore(s => s.setLoading);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [workflows, setWorkflows] = useState<WorkflowListDTO[] | null>(workflowsData ?? null);


    const filtered = useMemo(() =>
        workflows?.filter((w) => {
            const matchSearch = !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.description?.toLowerCase().includes(search.toLowerCase());
            const matchStatus = statusFilter === 'ALL' || w.status === statusFilter;
            return matchSearch && matchStatus;
        }),
        [workflows, search, statusFilter]
    );

    const statusCounts = useMemo(() => ({
        ALL: workflows?.length,
        ACTIVE: workflows?.filter((w) => w.status === 'ACTIVE').length,
        PENDING_REVIEW: workflows?.filter((w) => w.status === 'PENDING_REVIEW').length,
        DRAFT: workflows?.filter((w) => w.status === 'DRAFT').length,
        FAILED: workflows?.filter((w) => w.status === 'FAILED').length,
        INACTIVE: workflows?.filter((w) => w.status === 'INACTIVE').length,
    }), [workflows]);

    const columns: TableColumn<WorkflowListDTO>[] = [
        {
            key: 'name',
            label: 'Workflow',
            sortable: true,
            render: (_, row) => (
                <div className={styles.nameCell}>
                    <span className={styles.workflowName}>{row.name}</span>
                    <span className={styles.workflowDesc}>{row.description?.slice(0, 60)}...</span>
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            width: '130px',
            render: (v) => <StatusBadge status={String(v)} size="sm" />,
        },
        {
            key: 'endpoint',
            label: 'Endpoint',
            render: (_, row) => (
                <span className={styles.endpoint}>
                    <span className={styles.method}>{row.httpMethod}</span>
                    {row.endpoint}
                </span>
            ),
        },
        {
            key: 'executionCount',
            label: 'Executions',
            sortable: true,
            width: '110px',
            render: (v) => <span className={styles.mono}>{formatNumber(Number(v))}</span>,
        },
        {
            key: 'successRate',
            label: 'Success Rate',
            sortable: true,
            width: '110px',
            render: (v) => {
                const n = Number(v);
                return <span className={styles.mono} style={{ color: n >= 95 ? 'var(--color-success)' : n >= 80 ? 'var(--color-warning)' : 'var(--color-error)' }}>{n ? formatPercent(n) : '—'}</span>;
            },
        },
        {
            key: 'avgLatencyMs',
            label: 'Avg Latency',
            sortable: true,
            width: '110px',
            render: (v) => <span className={styles.mono}>{Number(v) ? formatLatency(Number(v)) : '—'}</span>,
        },
        {
            key: 'updatedAt',
            label: 'Updated',
            sortable: true,
            width: '120px',
            render: (v) => (
                <span className={styles.mono}>
                    <TimeAgo date={String(v)} />
                </span>
            )
        },
    ];
    console.log(JSON.stringify(workflowsData, null, 2));

    const labelToStatus: Record<string, StatusFilter> = {
        Active: 'ACTIVE',
        'Pending Review': 'PENDING_REVIEW',
        Draft: 'DRAFT',
        Error: 'FAILED',
    };
    return (
        <div className={styles.page}>
            <PageHeader
                title="Workflows"
                description="Manage and monitor AI-generated business workflows"
                actions={
                    <>
                        <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />}
                            onClick={() => {
                                setLoading(true);
                                workflowService.getWorkflows().then((d) => {
                                    // setWorkflows(d); 
                                    setLoading(false);
                                });
                            }}>
                            Refresh
                        </Button>
                        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => router.push('/workflows/new')}>
                            New Workflow
                        </Button>
                    </>
                }
            />

            {/* Summary cards */}
            <div className={styles.summaryRow}>
                {[
                    { label: 'Active', count: statusCounts.ACTIVE, icon: <CheckCircle2 size={14} />, color: 'var(--color-success)' },
                    { label: 'Pending Review', count: statusCounts.PENDING_REVIEW, icon: <Clock size={14} />, color: 'var(--color-warning)' },
                    { label: 'Draft', count: statusCounts.DRAFT, icon: <Zap size={14} />, color: 'var(--color-info)' },
                    { label: 'Error', count: statusCounts.FAILED, icon: <AlertTriangle size={14} />, color: 'var(--color-error)' },
                ].map((item) => (
                    <div key={item.label} className={styles.summaryCard} onClick={() => setStatusFilter(labelToStatus[item.label] ?? 'ALL')}>
                        <span style={{ color: item.color }}>{item.icon}</span>
                        <span className={styles.summaryCount}>{item.count}</span>
                        <span className={styles.summaryLabel}>{item.label}</span>
                    </div>
                ))}
            </div>

            {/* Filter bar */}
            <div className={styles.filterBar}>
                <div className={styles.searchWrap}>
                    <Search size={14} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search workflows..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
                <div className={styles.statusFilters}>
                    {(['ALL', 'ACTIVE', 'PENDING_REVIEW', 'DRAFT', 'INACTIVE', 'FAILED'] as StatusFilter[]).map((s) => (
                        <button
                            key={s}
                            className={`${styles.filterPill} ${statusFilter === s ? styles.filterPillActive : ''}`}
                            onClick={() => setStatusFilter(s)}
                        >
                            {s === 'ALL' ? 'All' : s.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
                            <span className={styles.filterCount}>{statusCounts[s]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={filtered!}
                isLoading={isLoading}
                keyExtractor={(row) => String(row.id)}
                emptyTitle="No workflows found"
                emptyDescription={search ? `No workflows match "${search}"` : 'Create your first workflow to get started.'}
                onRowClick={(row) => router.push(`/workflows/${row.id}`)}
            />

            {/* Generate new workflow prompt */}
            {!isLoading && filtered?.length === 0 && !search && (
                <div className={styles.generatePrompt}>
                    <Zap size={20} className={styles.generateIcon} />
                    <span>Ready to generate your first AI workflow?</span>
                    <Button variant="primary" size="sm" onClick={() => router.push('/workflows/new')}>
                        Generate with AI
                    </Button>
                </div>
            )}
        </div>
    );
}
