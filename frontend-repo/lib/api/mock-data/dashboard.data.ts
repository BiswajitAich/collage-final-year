// @ts-nocheck
import type {
  DashboardStats, RecentActivity, AISuggestion,
  TimeSeriesDataPoint, SystemHealth
} from '@/lib/types';

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
const minutesAgo = (n: number) => new Date(now.getTime() - n * 60000).toISOString();
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000).toISOString();

export const mockDashboardStats: DashboardStats = {
  totalWorkflows: 47,
  activeWorkflows: 31,
  activeEndpoints: 28,
  registeredTools: 19,
  voiceSessions: 1432,
  pendingApprovals: 5,
  uploadedSchemas: 12,
  totalExecutions: 94821,
  avgSuccessRate: 98.3,
  systemHealth: {
    status: 'healthy',
    uptime: 99.97,
    latencyMs: 42,
    activeConnections: 118,
    queueDepth: 7,
    services: [
      { name: 'AI Engine', status: 'healthy', latencyMs: 38, uptime: 99.99 },
      { name: 'Workflow Runner', status: 'healthy', latencyMs: 22, uptime: 99.97 },
      { name: 'n8n Bridge', status: 'healthy', latencyMs: 61, uptime: 99.94 },
      { name: 'Voice Gateway', status: 'healthy', latencyMs: 44, uptime: 99.91 },
      { name: 'Database', status: 'healthy', latencyMs: 8, uptime: 100 },
      { name: 'Schema Analyzer', status: 'degraded', latencyMs: 180, uptime: 98.5 },
    ],
  },
};

export const mockRecentActivity: RecentActivity[] = [];

export const mockAISuggestions: AISuggestion[] = [
  {
    id: 'sug_1',
    type: 'missing_workflow',
    title: 'Missing Refund Handler',
    description: 'Schema contains a "Refund" entity but no workflow handles refund processing. Would you like to generate one?',
    priority: 'high',
    actionLabel: 'Generate Workflow',
  },
  {
    id: 'sug_2',
    type: 'optimization',
    title: 'Slow Endpoint Detected',
    description: 'get-inventory-report averages 4.2s latency. AI suggests adding caching layer.',
    priority: 'medium',
    actionLabel: 'Optimize',
    entityId: 'wf_005',
  },
  {
    id: 'sug_3',
    type: 'tool_sync',
    title: 'Tool Out of Sync',
    description: 'fetch-customer-details tool schema changed in n8n 3 days ago. Sync recommended.',
    priority: 'medium',
    actionLabel: 'Sync Now',
    entityId: 'tool_003',
  },
  {
    id: 'sug_4',
    type: 'schema_update',
    title: 'Schema Drift Detected',
    description: 'Production DB has 2 new columns not in uploaded schema. Re-analyze recommended.',
    priority: 'low',
    actionLabel: 'Re-analyze',
  },
];

function generateTimeSeries(days: number, baseValue: number, variance: number): TimeSeriesDataPoint[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now.getTime() - (days - 1 - i) * 86400000);
    const value = Math.max(0, Math.round(baseValue + (Math.random() - 0.5) * variance));
    return {
      date: date.toISOString().split('T')[0],
      value,
    };
  });
}

export const mockWorkflowUsageTimeSeries = generateTimeSeries(30, 3200, 800);
export const mockSuccessRateTimeSeries = generateTimeSeries(30, 98, 4).map((d) => ({
  ...d,
  value: Math.min(100, Math.max(90, d.value)),
}));
export const mockEndpointCallsTimeSeries = generateTimeSeries(30, 5400, 1200);
export const mockVoiceSessionsTimeSeries = generateTimeSeries(30, 45, 20);


