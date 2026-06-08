'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { logService } from '@/lib/api/services';
import { PageHeader } from '@/components/ui/UIComponents';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { formatTime, timeAgo, truncate } from '@/lib/utils';
import type { LogEntry, TableColumn } from '@/lib/types';
import styles from './logs.module.css';

const LEVEL_COLORS: Record<string, string> = {
  success: 'var(--color-success)',
  info:    'var(--color-info)',
  warning: 'var(--color-warning)',
  error:   'var(--color-error)',
  debug:   'var(--text-tertiary)',
};

type LevelFilter = 'all' | 'success' | 'info' | 'warning' | 'error' | 'debug';

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [page, setPage] = useState(1);
  const limit = 20;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const { logs: data, total: t } = await logService.getLogs({
      search,
      status: levelFilter === 'all' ? undefined : levelFilter,
      page,
      limit,
    });
    setLogs(data);
    setTotal(t);
    setIsLoading(false);
  }, [search, levelFilter, page, limit]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, levelFilter]);

  const handleExport = async () => {
    const csv = await logService.exportLogs('csv');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const totalPages = Math.ceil(total / limit);

  const columns: TableColumn<LogEntry>[] = [
    {
      key: 'timestamp', label: 'Timestamp', sortable: true, width: '140px',
      render: (v) => <span className={styles.timestamp}>{formatTime(String(v))}</span>,
    },
    {
      key: 'level', label: 'Level', sortable: true, width: '90px',
      render: (v) => (
        <span className={styles.levelBadge} style={{ '--lvl-color': LEVEL_COLORS[String(v)] ?? 'var(--text-tertiary)' } as React.CSSProperties}>
          {String(v)}
        </span>
      ),
    },
    {
      key: 'component', label: 'Component', sortable: true, width: '150px',
      render: (v) => <code className={styles.component}>{String(v)}</code>,
    },
    {
      key: 'event', label: 'Event', sortable: true, width: '180px',
      render: (v) => <code className={styles.event}>{String(v)}</code>,
    },
    {
      key: 'message', label: 'Message',
      render: (v, row) => {
        const logRow = row as unknown as LogEntry;
        const isExpanded = expandedId === logRow.id;
        return (
          <div className={styles.messageCell}>
            <span className={`${styles.message} ${logRow.level === 'error' ? styles.messageError : ''}`}>
              {isExpanded ? String(v) : truncate(String(v), 80)}
            </span>
            {String(v).length > 80 && (
              <button className={styles.expandBtn} onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : logRow.id); }}>
                {isExpanded ? 'less' : 'more'}
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'workflowName', label: 'Workflow', width: '140px',
      render: (v) => v ? <span className={styles.workflowPill}>{String(v)}</span> : <span className={styles.dim}>—</span>,
    },
    {
      key: 'duration', label: 'Duration', sortable: true, width: '90px',
      render: (v) => v ? <span className={styles.mono}>{Number(v)}ms</span> : <span className={styles.dim}>—</span>,
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="System Logs"
        description="Real-time execution and event monitoring"
        actions={
          <>
            <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />} onClick={load}>Refresh</Button>
            <Button variant="secondary" size="sm" leftIcon={<Download size={14} />} onClick={handleExport}>Export CSV</Button>
          </>
        }
      />

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input type="text" placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className={styles.searchInput} />
        </div>
        <div className={styles.levelFilters}>
          {(['all', 'success', 'info', 'warning', 'error', 'debug'] as LevelFilter[]).map((lvl) => (
            <button
              key={lvl}
              className={`${styles.levelPill} ${levelFilter === lvl ? styles.levelPillActive : ''}`}
              style={levelFilter === lvl ? { '--pill-color': LEVEL_COLORS[lvl] ?? 'var(--accent-primary)' } as React.CSSProperties : undefined}
              onClick={() => setLevelFilter(lvl)}
            >
              {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
            </button>
          ))}
        </div>
        <span className={styles.totalCount}>{total} entries</span>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        keyExtractor={(row) => String(row.id)}
        emptyTitle="No logs found"
        emptyDescription={search ? `No logs match "${search}"` : 'No log entries available.'}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button variant="ghost" size="sm" leftIcon={<ChevronLeft size={14} />} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <div className={styles.pageNums}>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button key={p} className={`${styles.pageNum} ${page === p ? styles.pageNumActive : ''}`} onClick={() => setPage(p)}>
                  {p}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="sm" rightIcon={<ChevronRight size={14} />} disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
        </div>
      )}
    </div>
  );
}
