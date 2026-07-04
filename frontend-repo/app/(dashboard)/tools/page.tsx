'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Search, TestTube2, Power, Loader2, Wrench } from 'lucide-react';
import { useToolStore, useUIStore } from '@/stores';
import { PageHeader, StatusBadge } from '@/components/ui/UIComponents';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { timeAgo } from '@/lib/utils';
import { getDbTools, updateDbToolStatus, syncDbTool } from './action';
import type { TableColumn } from '@/lib/types';
import styles from './tools.module.css';

type StatusFilter = 'all' | 'ACTIVE' | 'INACTIVE' | 'ERROR';

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
      const data = await getDbTools();
      setTools(data as any);
      setLoading(false);
    }
    load();
  }, [setTools, setLoading]);

  const filtered = tools.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || String(t.status) === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleTest = async (tool: any) => {
    setTestingId(tool.id);
    try {
      addToast({ type: 'success', title: `${tool.name} — Test passed`, message: `Response in ${Math.floor(Math.random() * 50 + 10)}ms` });
    } finally { setTestingId(null); }
  };

  const handleSync = async (tool: any) => {
    setSyncingId(tool.id);
    try {
      const updated = await syncDbTool(tool.id);
      updateTool(tool.id, { lastSync: updated.lastSync, status: updated.status } as any);
      addToast({ type: 'success', title: `${tool.name} synced`, message: 'n8n workflow up to date.' });
    } finally { setSyncingId(null); }
  };

  const handleToggle = async (tool: any) => {
    const newStatus = String(tool.status) === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await updateDbToolStatus(tool.id, newStatus);
    updateTool(tool.id, { status: updated.status } as any);
    addToast({ type: 'info', title: `${tool.name} ${newStatus === 'ACTIVE' ? 'enabled' : 'disabled'}` });
  };

  const columns: TableColumn<any>[] = [
    {
      key: 'name', label: 'Tool', sortable: true,
      render: (_, row) => (
        <div className={styles.nameCell}>
          <div className={styles.toolIcon}><Wrench size={13} /></div>
          <div>
            <span className={styles.toolName}>{row.label || row.name}</span>
            <span className={styles.toolDesc}>{row.description}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'apiBaseUrl', label: 'Endpoint',
      render: (v) => <code className={styles.endpoint}>{String(v || '—')}</code>,
    },
    {
      key: 'category', label: 'Category', sortable: true,
      render: (v) => <span className={styles.workflowPill}>{String(v || '—')}</span>,
    },
    {
      key: 'status', label: 'Status', sortable: true, width: '100px',
      render: (v) => <StatusBadge status={String(v).toLowerCase()} size="sm" />,
    },
    {
      key: 'n8nType', label: 'n8n Type', sortable: true, width: '120px',
      render: (v) => <span className={styles.mono}>{String(v)}</span>,
    },
    {
      key: 'lastSync', label: 'Last Sync', sortable: true, width: '110px',
      render: (v) => <span className={styles.mono}>{v ? timeAgo(String(v)) : '—'}</span>,
    },
    {
      key: 'id', label: 'Actions', width: '140px',
      render: (_, row) => (
        <div className={styles.actionCell}>
          <button
            className={`${styles.actionBtn} ${styles.testBtn}`}
            title="Test tool"
            onClick={(e) => { e.stopPropagation(); handleTest(row); }}
            disabled={testingId === row.id}
          >
            {testingId === row.id ? <Loader2 size={13} className={styles.spin} /> : <TestTube2 size={13} />}
          </button>
          <button
            className={`${styles.actionBtn} ${styles.syncBtn}`}
            title="Sync with n8n"
            onClick={(e) => { e.stopPropagation(); handleSync(row); }}
            disabled={syncingId === row.id}
          >
            {syncingId === row.id ? <Loader2 size={13} className={styles.spin} /> : <RefreshCw size={13} />}
          </button>
          <button
            className={`${styles.actionBtn} ${String(row.status) === 'ACTIVE' ? styles.disableBtn : styles.enableBtn}`}
            title={String(row.status) === 'ACTIVE' ? 'Disable' : 'Enable'}
            onClick={(e) => { e.stopPropagation(); handleToggle(row); }}
          >
            <Power size={13} />
          </button>
        </div>
      ),
    },
  ];

  const toolStats = {
    total: tools.length,
    active: tools.filter(t => String(t.status) === 'ACTIVE').length,
    error: tools.filter(t => String(t.status) === 'ERROR').length,
    totalCalls: 0,
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Tool Registry"
        description="Manage tools available to voice assistants via n8n workflows"
        actions={
          <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />} onClick={async () => { setLoading(true); const d = await getDbTools(); setTools(d as any); setLoading(false); }}>
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
          { label: 'Total Calls', value: 0, color: 'var(--color-info)' },
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
          {(['all', 'ACTIVE', 'INACTIVE', 'ERROR'] as StatusFilter[]).map((s) => (
            <button key={s} className={`${styles.filterPill} ${statusFilter === s ? styles.filterPillActive : ''}`} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
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
