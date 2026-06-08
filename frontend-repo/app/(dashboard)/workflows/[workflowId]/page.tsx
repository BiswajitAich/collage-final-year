'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Edit3, Play, Pause, Copy, Trash2, ExternalLink,
  Tag, Shield, Cpu, Clock, CheckCircle2, Activity
} from 'lucide-react';
import { workflowService } from '@/lib/api/services';
import { useWorkflowStore, useUIStore } from '@/stores';
import { PageHeader, StatusBadge, LoadingSkeleton, ErrorState, Card } from '@/components/ui/UIComponents';
import { Button } from '@/components/ui/Button';
import { WorkflowGraph } from '@/components/workflow/WorkflowGraph';
import {
  formatDateTime, formatNumber, formatPercent, formatLatency, timeAgo
} from '@/lib/utils';
import styles from './workflow-detail.module.css';

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.workflowId as string;
  const { selectedWorkflow, setSelectedWorkflow, updateWorkflow } = useWorkflowStore();
  const { addToast } = useUIStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError('');
      const wf = await workflowService.getWorkflow(workflowId);
      if (!wf) { setError('Workflow not found'); setIsLoading(false); return; }
      setSelectedWorkflow(wf);
      setIsLoading(false);
    }
    load();
    return () => setSelectedWorkflow(null);
  }, [workflowId, setSelectedWorkflow]);

  const handleActivate = async () => {
    if (!selectedWorkflow) return;
    setIsActioning(true);
    try {
      const updated = await workflowService.activateWorkflow(workflowId);
      updateWorkflow(workflowId, { status: updated.status });
      setSelectedWorkflow(updated);
      addToast({ type: 'success', title: 'Workflow activated', message: `${updated.name} is now serving traffic.` });
    } finally { setIsActioning(false); }
  };

  const handleDeactivate = async () => {
    if (!selectedWorkflow) return;
    setIsActioning(true);
    try {
      const updated = await workflowService.deactivateWorkflow(workflowId);
      updateWorkflow(workflowId, { status: updated.status });
      setSelectedWorkflow(updated);
      addToast({ type: 'info', title: 'Workflow deactivated', message: `${updated.name} is no longer serving traffic.` });
    } finally { setIsActioning(false); }
  };

  if (isLoading) return <DetailSkeleton />;
  if (error || !selectedWorkflow) return (
    <ErrorState title="Workflow not found" message={error || 'This workflow does not exist.'} onRetry={() => router.push('/workflows')} />
  );

  const wf = selectedWorkflow;
  const isActive = wf.status === 'active';

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/workflows')}>
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
          {isActive ? (
            <Button variant="danger" size="sm" leftIcon={<Pause size={14} />} isLoading={isActioning} onClick={handleDeactivate}>
              Deactivate
            </Button>
          ) : (
            <Button variant="success" size="sm" leftIcon={<Play size={14} />} isLoading={isActioning} onClick={handleActivate}>
              Activate
            </Button>
          )}
          <Button variant="secondary" size="sm" leftIcon={<Edit3 size={14} />} onClick={() => router.push(`/workflows/${workflowId}/edit`)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" leftIcon={<Copy size={14} />} onClick={() => addToast({ type: 'success', title: 'Duplicated', message: 'Workflow copy created.' })}>
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
              { label: 'Executions', value: formatNumber(wf.executionCount), icon: <Activity size={14} /> },
              { label: 'Success Rate', value: wf.successRate ? formatPercent(wf.successRate) : '—', icon: <CheckCircle2 size={14} /> },
              { label: 'Avg Latency', value: wf.avgLatencyMs ? formatLatency(wf.avgLatencyMs) : '—', icon: <Clock size={14} /> },
              { label: 'Version', value: `v${wf.currentVersion}`, icon: <Cpu size={14} /> },
            ].map((stat) => (
              <div key={stat.label} className={styles.statCard}>
                <span className={styles.statIcon}>{stat.icon}</span>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Workflow Graph */}
          <div className={styles.graphCard}>
            <h3 className={styles.cardTitle}>Workflow Graph</h3>
            <div className={styles.graphWrap}>
              <WorkflowGraph nodes={wf.nodes} edges={wf.edges} />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className={styles.rightCol}>
          {/* Endpoint Info */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Endpoint</h3>
            <div className={styles.endpointBlock}>
              <span className={styles.endpointMethod}>{wf.httpMethod}</span>
              <code className={styles.endpointUrl}>{wf.endpoint}</code>
              <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(wf.endpoint)} title="Copy endpoint">
                <Copy size={12} />
              </button>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}><span className={styles.metaKey}>Type</span><span className={styles.metaVal}>{wf.endpointType}</span></div>
              <div className={styles.metaItem}><span className={styles.metaKey}>Auth</span><span className={styles.metaVal}>{wf.requiresAuth ? 'Required' : 'Public'}</span></div>
              <div className={styles.metaItem}><span className={styles.metaKey}>Mode</span><span className={styles.metaVal}>{wf.generationMode}</span></div>
              <div className={styles.metaItem}><span className={styles.metaKey}>n8n ID</span><span className={styles.metaVal}>{wf.n8nWorkflowId ?? '—'}</span></div>
            </div>
          </div>

          {/* Entities */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Entities</h3>
            <div className={styles.tagList}>
              {wf.entities.map((e) => (
                <span key={e} className={styles.entityTag}>{e}</span>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Tags</h3>
            <div className={styles.tagList}>
              {wf.tags.map((t) => (
                <span key={t} className={styles.tag}><Tag size={10} /> {t}</span>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Permissions</h3>
            <div className={styles.tagList}>
              {wf.permissions.map((p) => (
                <span key={p} className={styles.permTag}><Shield size={10} /> {p}</span>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Timeline</h3>
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <span className={styles.timelineDot} />
                <span className={styles.timelineLabel}>Created</span>
                <span className={styles.timelineDate}>{timeAgo(wf.createdAt)}</span>
              </div>
              <div className={styles.timelineItem}>
                <span className={styles.timelineDot} />
                <span className={styles.timelineLabel}>Last updated</span>
                <span className={styles.timelineDate}>{timeAgo(wf.updatedAt)}</span>
              </div>
              {wf.approvedAt && (
                <div className={styles.timelineItem}>
                  <span className={`${styles.timelineDot} ${styles.timelineDotSuccess}`} />
                  <span className={styles.timelineLabel}>Approved by {wf.approvedBy}</span>
                  <span className={styles.timelineDate}>{timeAgo(wf.approvedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Version History */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Version History</h3>
            <div className={styles.versionList}>
              {wf.versions.map((v) => (
                <div key={v.id} className={styles.versionItem}>
                  <span className={`${styles.versionBadge} ${v.isActive ? styles.versionBadgeActive : ''}`}>
                    v{v.version}
                  </span>
                  <div className={styles.versionInfo}>
                    <span className={styles.versionChangelog}>{v.changelog}</span>
                    <span className={styles.versionDate}>{timeAgo(v.createdAt)} by {v.createdBy}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <LoadingSkeleton height={80} rounded />
      <LoadingSkeleton height={64} count={4} />
      <LoadingSkeleton height={400} rounded />
    </div>
  );
}
