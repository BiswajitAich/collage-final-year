'use client';

import { useEffect, useState } from 'react';
import {
  Workflow, Database, Wrench, Mic, Clock, FileCode2,
  CheckCircle2, AlertTriangle, XCircle, Lightbulb, Activity,
  TrendingUp, Zap, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { dashboardService } from '@/lib/api/dashboard.service';
import { useDashboardStore } from '@/stores';
import { StatCard, LoadingSkeleton, EmptyState } from '@/components/ui/UIComponents';
import { StatusBadge } from '@/components/ui/UIComponents';
import { timeAgo, formatPercent, getStatusColor } from '@/lib/utils';
import type { RecentActivity, AISuggestion, TimeSeriesDataPoint } from '@/lib/types';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const stats = useDashboardStore(s => s.stats);
  const recentActivity = useDashboardStore(s => s.recentActivity);
  const aiSuggestions = useDashboardStore(s => s.aiSuggestions);
  const setStats = useDashboardStore(s => s.setStats);
  const setRecentActivity = useDashboardStore(s => s.setRecentActivity);
  const setAISuggestions = useDashboardStore(s => s.setAISuggestions);
  const [isLoading, setIsLoading] = useState(true);
  const [execSeries, setExecSeries] = useState<TimeSeriesDataPoint[]>([]);
  const [successSeries, setSuccessSeries] = useState<TimeSeriesDataPoint[]>([]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const [s, a, sug, exec, success] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentActivity(),
        dashboardService.getAISuggestions(),
        dashboardService.getWorkflowUsageSeries(14),
        dashboardService.getSuccessRateSeries(14),
      ]);
      setStats(s);
      setRecentActivity(a);
      setAISuggestions(sug);
      setExecSeries(exec);
      setSuccessSeries(success);
      setIsLoading(false);
    }
    load();
  }, [setStats, setRecentActivity, setAISuggestions]);

  const activityIcon = (type: RecentActivity['type']) => {
    const map = {
      workflow_created: <Zap size={14} />,
      schema_uploaded: <Database size={14} />,
      tool_synced: <Wrench size={14} />,
      voice_session: <Mic size={14} />,
      approval_needed: <AlertTriangle size={14} />,
      workflow_executed: <CheckCircle2 size={14} />,
      error: <XCircle size={14} />,
    };
    return map[type] ?? <Activity size={14} />;
  };

  const suggestionIcon = (type: AISuggestion['type']) => {
    const map = {
      optimization: <TrendingUp size={14} />,
      missing_workflow: <Workflow size={14} />,
      tool_sync: <Wrench size={14} />,
      schema_update: <Database size={14} />,
    };
    return map[type] ?? <Lightbulb size={14} />;
  };

  return (
    <div className={styles.page}>
      {/* Stat Cards */}
      <div className={styles.statsGrid}>
        <StatCard title="Total Workflows" value={stats?.totalWorkflows ?? 0} subtitle={`${stats?.activeWorkflows ?? 0} active`} icon={<Workflow size={16} />} trend="up" change={12.4} accentColor="var(--accent-primary)" isLoading={isLoading} />
        <StatCard title="Active Endpoints" value={stats?.activeEndpoints ?? 0} subtitle="Serving traffic" icon={<Activity size={16} />} trend="up" change={8.1} accentColor="var(--color-success)" isLoading={isLoading} />
        <StatCard title="Registered Tools" value={stats?.registeredTools ?? 0} subtitle="Voice agent tools" icon={<Wrench size={16} />} trend="up" change={35.7} accentColor="var(--accent-secondary)" isLoading={isLoading} />
        <StatCard title="Voice Sessions" value={stats?.voiceSessions ?? 0} subtitle="Last 30 days" icon={<Mic size={16} />} trend="up" change={19.5} accentColor="var(--color-info)" isLoading={isLoading} />
        <StatCard title="Pending Approvals" value={stats?.pendingApprovals ?? 0} subtitle="Awaiting review" icon={<Clock size={16} />} accentColor="var(--color-warning)" isLoading={isLoading} />
        <StatCard title="Uploaded Schemas" value={stats?.uploadedSchemas ?? 0} subtitle="Analyzed by AI" icon={<FileCode2 size={16} />} trend="up" change={5.2} accentColor="var(--color-error)" isLoading={isLoading} />
      </div>

      <div className={styles.mainGrid}>
        {/* Left Column */}
        <div className={styles.leftCol}>
          {/* Execution Trend */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Execution Trend</h3>
              <span className={styles.cardMeta}>Last 14 days</span>
            </div>
            {isLoading ? (
              <LoadingSkeleton height={120} />
            ) : (
              <div className={styles.bigChart}>
                <BigLineChart data={execSeries} color="var(--accent-primary)" />
              </div>
            )}
          </div>

          {/* Success Rate */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Success Rate</h3>
              {stats && (
                <span className={styles.cardBadge}>{formatPercent(stats.avgSuccessRate)}</span>
              )}
            </div>
            {isLoading ? (
              <LoadingSkeleton height={100} />
            ) : (
              <div className={styles.bigChart}>
                <BigLineChart data={successSeries} color="var(--color-success)" />
              </div>
            )}
          </div>

          {/* System Health */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>System Health</h3>
              {stats && <StatusBadge status={stats.systemHealth.status} size="sm" />}
            </div>
            <div className={styles.serviceList}>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <LoadingSkeleton key={i} height={36} />)
                : stats?.systemHealth.services.map((svc) => (
                    <div key={svc.name} className={styles.serviceRow}>
                      <span className={styles.serviceDot} style={{ background: getStatusColor(svc.status) }} />
                      <span className={styles.serviceName}>{svc.name}</span>
                      <span className={styles.serviceLatency}>{svc.latencyMs}ms</span>
                      <span className={styles.serviceUptime}>{svc.uptime}%</span>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className={styles.rightCol}>
          {/* AI Suggestions */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>AI Suggestions</h3>
              <span className={styles.cardMeta}>{aiSuggestions.length} insights</span>
            </div>
            <div className={styles.suggestionList}>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <LoadingSkeleton key={i} height={72} rounded />)
              ) : aiSuggestions.length === 0 ? (
                <EmptyState title="No suggestions" description="AI has no current insights." />
              ) : (
                aiSuggestions.map((sug) => (
                  <div key={sug.id} className={`${styles.suggestionItem} ${styles[`sug_${sug.priority}`]}`}>
                    <div className={styles.sugIcon}>{suggestionIcon(sug.type)}</div>
                    <div className={styles.sugContent}>
                      <span className={styles.sugTitle}>{sug.title}</span>
                      <span className={styles.sugDesc}>{sug.description}</span>
                    </div>
                    <button className={styles.sugAction}>{sug.actionLabel} <ArrowRight size={11} /></button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Recent Activity</h3>
              <Link href="/logs" className={styles.cardLink}>View all <ArrowRight size={12} /></Link>
            </div>
            <div className={styles.activityList}>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <LoadingSkeleton key={i} height={48} />)
              ) : recentActivity.length === 0 ? (
                <EmptyState title="No recent activity" />
              ) : (
                recentActivity.map((act) => (
                  <div key={act.id} className={styles.activityItem}>
                    <div className={`${styles.actIcon} ${act.type === 'error' ? styles.actIconError : act.type === 'approval_needed' ? styles.actIconWarn : styles.actIconDefault}`}>
                      {activityIcon(act.type)}
                    </div>
                    <div className={styles.actContent}>
                      <span className={styles.actTitle}>{act.title}</span>
                      <span className={styles.actDesc}>{act.description}</span>
                    </div>
                    <span className={styles.actTime}>{timeAgo(act.timestamp)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple inline chart component
function BigLineChart({ data, color }: { data: TimeSeriesDataPoint[]; color: string }) {
  if (!data.length) return null;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 600; const H = 100;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 10) - 5;
    return `${x},${y}`;
  });
  const area = `M${pts[0]} L${pts.join(' L')} L${W},${H} L0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#chartGrad)" />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
