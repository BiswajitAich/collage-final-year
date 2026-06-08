'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { LoadingSkeleton, EmptyState } from './UIComponents';
import type { TableColumn } from '@/lib/types';
import styles from './DataTable.module.css';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface DataTableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T = any>({
  columns,
  data,
  isLoading,
  emptyTitle = 'No data found',
  emptyDescription,
  keyExtractor,
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedData = [...data].sort((a: any, b: any) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal == null || bVal == null) return 0;
    const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableScroll}>
        <table className={styles.table} role="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`${styles.th} ${col.sortable ? styles.thSortable : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                  aria-sort={
                    sortKey === String(col.key)
                      ? sortOrder === 'asc' ? 'ascending' : 'descending'
                      : 'none'
                  }
                >
                  <span className={styles.thContent}>
                    {col.label}
                    {col.sortable && (
                      <span className={styles.sortIcon}>
                        {sortKey === String(col.key)
                          ? sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          : <ChevronsUpDown size={12} />}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  {columns.map((col) => (
                    <td key={String(col.key)} className={styles.td}>
                      <LoadingSkeleton height={16} width={col.width ?? '80%'} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={styles.emptyCell}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              sortedData.map((row: any) => (
                <tr
                  key={keyExtractor(row)}
                  className={`${styles.tr} ${onRowClick ? styles.trClickable : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
                >
                  {columns.map((col) => (
                    <td key={String(col.key)} className={styles.td}>
                      {col.render
                        ? col.render(row[col.key as string], row)
                        : String(row[col.key as string] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
