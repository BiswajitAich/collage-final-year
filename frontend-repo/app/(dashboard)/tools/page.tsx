'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Search, TestTube2, Pencil, Power, Loader2, Wrench, CheckCircle2 } from 'lucide-react';
import { toolService } from '@/lib/api/services';
import { useToolStore, useUIStore } from '@/stores';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui/UIComponents';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { timeAgo, formatNumber, formatPercent, formatLatency } from '@/lib/utils';
import type { Tool, TableColumn } from '@/lib/types';
import styles from './tools.module.css';

type StatusFilter = 'all' | 'active' | 'inactive' | 'error' | 'syncing';

export default function ToolsPage() {
  const tools = useToolStore(s => s.tools);
  const setTools = useToolStore(s => s.setTools);
  const updateTool = useToolStore(s => s.updateTool);
  const isLoading = useToolStore(s => s.isLoading);
  const setLoading = useToolStore(s => s.setLoading);
  const addToast = useUIStore(s => s.addToast);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await toolService.getTools();
      setTools(data);
      setLoading(false);
    }
    load();
  }, [setTools, setLoading]);

  const filtered = tools.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleTest = async (tool: Tool) => {
    setTestingId(tool.id);
    try {
      const result = await toolService.testTool(tool.id);
      if (result.success) {
        addToast({ type: 'success', title: `${tool.name} — Test passed`, message: `Response in ${result.latencyMs}ms` });
      } else {
        addToast({ type: 'error', title: `${tool.name} — Test failed` });
      }
    } finally { setTestingId(null); }
  };

  const handleSync = async (tool: Tool) => {
    setSyncingId(tool.id);
    try {
      const updated = await toolService.syncTool(tool.id);
      updateTool(tool.id, { lastSync: updated.lastSync, status: updated.status });
      addToast({ type: 'success', title: `${tool.name} synced`, message: 'n8n workflow up to date.' });
    } finally { setSyncingId(null); }
  };

  const handleToggle = async (tool: Tool) => {
    const newEnabled = tool.status !== 'active';
    const updated = await toolService.toggleTool(tool.id, newEnabled);
    updateTool(tool.id, { status: updated.status });
    addToast({ type: 'info', title: `${tool.name} ${newEnabled ? 'enabled' : 'disabled'}` });
  };

  const columns: TableColumn<Tool>[] = [
    {
      key: 'name', label: 'Tool', sortable: true,
      render: (_, row) => (
        <div className={styles.nameCell}>
          <div className={styles.toolIcon}><Wrench size={13} /></div>
          <div>
            <span className={styles.toolName}>{row.name}</span>
            <span className={styles.toolDesc}>{row.description}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'endpoint', label: 'Endpoint',
      render: (v) => <code className={styles.endpoint}>{String(v)}</code>,
    },
    {
      key: 'workflowName', label: 'Workflow', sortable: true,
      render: (v) => <span className={styles.workflowPill}>{String(v)}</span>,
    },
    {
      key: 'status', label: 'Status', sortable: true, width: '100px',
      render: (v) => <StatusBadge status={String(v)} size="sm" />,
    },
    {
      key: 'successRate', label: 'Success Rate', sortable: true, width: '110px',
      render: (v) => {
        const n = Number(v);
        return <span className={styles.mono} style={{ color: n >= 95 ? 'var(--color-success)' : n >= 80 ? 'var(--color-warning)' : 'var(--color-error)' }}>{n ? formatPercent(n) : '—'}</span>;
      },
    },
    {
      key: 'lastSync', label: 'Last Sync', sortable: true, width: '110px',
      render: (v) => <span className={styles.mono}>{timeAgo(String(v))}</span>,
    },
    {
      key: 'id', label: 'Actions', width: '140px',
      render: (_, row) => (
        <div className={styles.actionCell}>
          <button
            className={`${styles.actionBtn} ${styles.testBtn}`}
            title="Test tool"
            onClick={(e) => { e.stopPropagation(); handleTest(row as unknown as Tool); }}
            disabled={testingId === row.id}
          >
            {testingId === row.id ? <Loader2 size={13} className={styles.spin} /> : <TestTube2 size={13} />}
          </button>
          <button
            className={`${styles.actionBtn} ${styles.syncBtn}`}
            title="Sync with n8n"
            onClick={(e) => { e.stopPropagation(); handleSync(row as unknown as Tool); }}
            disabled={syncingId === row.id}
          >
            {syncingId === row.id ? <Loader2 size={13} className={styles.spin} /> : <RefreshCw size={13} />}
          </button>
          <button
            className={`${styles.actionBtn} ${(row as unknown as Tool).status === 'active' ? styles.disableBtn : styles.enableBtn}`}
            title={(row as unknown as Tool).status === 'active' ? 'Disable' : 'Enable'}
            onClick={(e) => { e.stopPropagation(); handleToggle(row as unknown as Tool); }}
          >
            <Power size={13} />
          </button>
        </div>
      ),
    },
  ];

  const toolStats = {
    total: tools.length,
    active: tools.filter(t => t.status === 'active').length,
    error: tools.filter(t => t.status === 'error').length,
    totalCalls: tools.reduce((s, t) => s + t.usageCount, 0),
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Tool Registry"
        description="Manage tools available to voice assistants via n8n workflows"
        actions={
          <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />} onClick={async () => { setLoading(true); const d = await toolService.getTools(); setTools(d); setLoading(false); }}>
            Sync All
          </Button>
        }
      />

      {/* Summary */}
      <div className={styles.summaryRow}>
        {[
          { label: 'Total Tools', value: toolStats.total, color: 'var(--accent-primary)' },
          { label: 'Active', value: toolStats.active, color: 'var(--color-success)' },
          { label: 'Errors', value: toolStats.error, color: 'var(--color-error)' },
          { label: 'Total Calls', value: formatNumber(toolStats.totalCalls), color: 'var(--color-info)' },
        ].map((s) => (
          <div key={s.label} className={styles.summaryCard}>
            <span className={styles.summaryValue} style={{ color: s.color }}>{s.value}</span>
            <span className={styles.summaryLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input type="text" placeholder="Search tools..." value={search} onChange={(e) => setSearch(e.target.value)} className={styles.searchInput} />
        </div>
        <div className={styles.statusFilters}>
          {(['all', 'active', 'inactive', 'error'] as StatusFilter[]).map((s) => (
            <button key={s} className={`${styles.filterPill} ${statusFilter === s ? styles.filterPillActive : ''}`} onClick={() => setStatusFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        keyExtractor={(row) => String(row.id)}
        emptyTitle="No tools found"
        emptyDescription={search ? `No tools match "${search}"` : 'No tools registered yet.'}
      />
    </div>
  );
}
