'use client';

import { useEffect, useState } from 'react';
import { Calendar, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { analyticsService } from '@/lib/api/services';
import { PageHeader, MetricCard, LoadingSkeleton } from '@/components/ui/UIComponents';
import { formatNumber, formatPercent } from '@/lib/utils';
import type { AnalyticsDashboard, TimeSeriesDataPoint } from '@/lib/types';
import styles from './analytics.module.css';

type DateRange = '7d' | '30d' | '90d';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const result = await analyticsService.getDashboard();
      setData(result);
      setIsLoading(false);
    }
    load();
  }, [dateRange]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Analytics"
        description="Platform performance metrics and insights"
        actions={
          <div className={styles.dateRangeSelector}>
            {(['7d', '30d', '90d'] as DateRange[]).map((r) => (
              <button key={r} className={`${styles.rangeBtn} ${dateRange === r ? styles.rangeBtnActive : ''}`} onClick={() => setDateRange(r)}>
                {r === '7d' ? '7 days' : r === '30d' ? '30 days' : '90 days'}
              </button>
            ))}
          </div>
        }
      />

      {/* Metric Cards */}
      <div className={styles.metricsGrid}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <LoadingSkeleton key={i} height={100} rounded />)
          : data?.metrics.map((m) => <MetricCard key={m.id} metric={m} />)
        }
      </div>

      {/* Charts Row */}
      <div className={styles.chartsGrid}>
        <LineChartCard
          title="Workflow Executions"
          data={data?.workflowUsage ?? []}
          color="var(--accent-primary)"
          isLoading={isLoading}
        />
        <LineChartCard
          title="Success Rate (%)"
          data={data?.successRate ?? []}
          color="var(--color-success)"
          isLoading={isLoading}
          minY={85}
          maxY={100}
        />
      </div>

      <div className={styles.chartsGrid}>
        <LineChartCard
          title="Endpoint Calls"
          data={data?.endpointCalls ?? []}
          color="var(--accent-secondary)"
          isLoading={isLoading}
        />
        <LineChartCard
          title="Voice Sessions"
          data={data?.voiceSessions ?? []}
          color="var(--color-info)"
          isLoading={isLoading}
        />
      </div>

      {/* Bottom Row */}
      <div className={styles.bottomGrid}>
        {/* Top Workflows Table */}
        <div className={styles.tableCard}>
          <h3 className={styles.cardTitle}>Top Workflows by Executions</h3>
          <div className={styles.rankTable}>
            <div className={styles.rankHeader}>
              <span>Workflow</span>
              <span>Executions</span>
              <span>Success Rate</span>
              <span>Avg Latency</span>
            </div>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <LoadingSkeleton key={i} height={40} />)
              : data?.topWorkflows.map((wf, i) => (
                  <div key={wf.workflowId} className={styles.rankRow}>
                    <span className={styles.rankNum}>{i + 1}</span>
                    <span className={styles.rankName}>{wf.workflowName}</span>
                    <span className={styles.rankVal}>{formatNumber(wf.executionCount)}</span>
                    <span className={styles.rankRate} style={{ color: wf.successRate >= 95 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                      {formatPercent(wf.successRate)}
                    </span>
                    <span className={styles.rankLatency}>{wf.avgLatencyMs}ms</span>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Tool Usage */}
        <div className={styles.tableCard}>
          <h3 className={styles.cardTitle}>Tool Usage</h3>
          <div className={styles.toolBarList}>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <LoadingSkeleton key={i} height={40} />)
              : data?.toolUsage.map((t) => {
                  const pct = (t.callCount / (data.toolUsage[0]?.callCount || 1)) * 100;
                  return (
                    <div key={t.toolId} className={styles.toolBarItem}>
                      <div className={styles.toolBarHeader}>
                        <span className={styles.toolBarName}>{t.toolName}</span>
                        <span className={styles.toolBarCount}>{formatNumber(t.callCount)}</span>
                      </div>
                      <div className={styles.toolBarTrack}>
                        <div className={styles.toolBarFill} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// === CHART COMPONENTS ===

interface LineChartCardProps {
  title: string;
  data: TimeSeriesDataPoint[];
  color: string;
  isLoading?: boolean;
  minY?: number;
  maxY?: number;
}

function LineChartCard({ title, data, color, isLoading, minY, maxY }: LineChartCardProps) {
  if (isLoading) return <LoadingSkeleton height={220} rounded />;

  const values = data.map((d) => d.value);
  const dataMin = minY ?? Math.min(...values);
  const dataMax = maxY ?? Math.max(...values);
  const range = dataMax - dataMin || 1;
  const W = 600; const H = 120;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - dataMin) / range) * (H - 16) - 8;
    return { x, y };
  });

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M${pts[0].x},${pts[0].y} ${pts.map(p => `L${p.x},${p.y}`).join(' ')} L${W},${H} L0,${H} Z`;

  const latest = values[values.length - 1];
  const previous = values[values.length - 2];
  const change = previous ? ((latest - previous) / previous) * 100 : 0;

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <div className={styles.chartStats}>
          <span className={styles.chartCurrent} style={{ color }}>{typeof latest === 'number' && latest % 1 !== 0 ? latest.toFixed(1) : formatNumber(latest)}</span>
          <span className={`${styles.chartChange} ${change >= 0 ? styles.changePos : styles.changeNeg}`}>
            {change >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="130" className={styles.chart} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#grad-${title.replace(/\s/g, '')})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3.5" fill={color} />
      </svg>

      <div className={styles.xAxis}>
        {[data[0], data[Math.floor(data.length / 2)], data[data.length - 1]].map((d, i) => (
          <span key={i} className={styles.xLabel}>{d?.date?.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}
