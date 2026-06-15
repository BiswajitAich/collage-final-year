// ── DEPRECATED: Replaced by app/(dashboard)/dashboard/actions.ts ──────────────
// All dashboard data now comes from real Prisma queries.
// This file is kept for reference only and no longer imported anywhere.
//
// To restore mock data for development:
//   1. Uncomment everything below
//   2. Re-enable imports in lib/api/dashboard.service.ts

// import type {
//   DashboardStats, RecentActivity, AISuggestion,
//   TimeSeriesDataPoint, SystemHealth
// } from '@/lib/types';
//
// const now = new Date();
// const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
// const minutesAgo = (n: number) => new Date(now.getTime() - n * 60000).toISOString();
// const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000).toISOString();
//
// export const mockDashboardStats: DashboardStats = {
//   totalWorkflows: 47,
//   activeWorkflows: 31,
//   activeEndpoints: 28,
//   registeredTools: 19,
//   voiceSessions: 1432,
//   pendingApprovals: 5,
//   uploadedSchemas: 12,
//   totalExecutions: 94821,
//   avgSuccessRate: 98.3,
//   systemHealth: {
//     status: 'healthy',
//     uptime: 99.97,
//     latencyMs: 42,
//     activeConnections: 118,
//     queueDepth: 7,
//     services: [
//       { name: 'AI Engine', status: 'healthy', latencyMs: 38, uptime: 99.99 },
//       { name: 'Workflow Runner', status: 'healthy', latencyMs: 22, uptime: 99.97 },
//       { name: 'n8n Bridge', status: 'healthy', latencyMs: 61, uptime: 99.94 },
//       { name: 'Voice Gateway', status: 'healthy', latencyMs: 44, uptime: 99.91 },
//       { name: 'Database', status: 'healthy', latencyMs: 8, uptime: 100 },
//       { name: 'Schema Analyzer', status: 'degraded', latencyMs: 180, uptime: 98.5 },
//     ],
//   },
// };
//
// export const mockRecentActivity: RecentActivity[] = [
//   {
//     id: 'act_1',
//     type: 'workflow_executed',
//     title: 'Workflow Executed',
//     description: 'create-order executed successfully (42ms)',
//     timestamp: minutesAgo(2),
//     entityId: 'wf_001',
//     entityName: 'create-order',
//     status: 'active',
//     user: 'system',
//   },
//   {
//     id: 'act_2',
//     type: 'approval_needed',
//     title: 'Approval Required',
//     description: 'update-inventory-batch workflow awaiting review',
//     timestamp: minutesAgo(8),
//     entityId: 'wf_012',
//     entityName: 'update-inventory-batch',
//     status: 'pending',
//     user: 'ai-generator',
//   },
//   {
//     id: 'act_3',
//     type: 'schema_uploaded',
//     title: 'Schema Uploaded',
//     description: 'ecommerce-v2.prisma analyzed — 23 entities detected',
//     timestamp: minutesAgo(34),
//     entityId: 'schema_004',
//     entityName: 'ecommerce-v2.prisma',
//     status: 'active',
//     user: 'sarah.chen@company.com',
//   },
//   {
//     id: 'act_4',
//     type: 'voice_session',
//     title: 'Voice Session',
//     description: 'Customer support session ended — 18 turns, 4 tool calls',
//     timestamp: hoursAgo(1),
//     status: 'active',
//     user: 'voice-agent',
//   },
//   {
//     id: 'act_5',
//     type: 'tool_synced',
//     title: 'Tool Synced',
//     description: 'fetch-product-catalog synced with n8n (v2.1)',
//     timestamp: hoursAgo(2),
//     entityId: 'tool_007',
//     entityName: 'fetch-product-catalog',
//     status: 'active',
//     user: 'system',
//   },
//   {
//     id: 'act_6',
//     type: 'error',
//     title: 'Execution Error',
//     description: 'send-notification failed: Rate limit exceeded',
//     timestamp: hoursAgo(3),
//     entityId: 'wf_019',
//     entityName: 'send-notification',
//     status: 'error',
//     user: 'system',
//   },
//   {
//     id: 'act_7',
//     type: 'workflow_created',
//     title: 'Workflow Generated',
//     description: 'AI generated process-refund workflow (confidence: 94%)',
//     timestamp: hoursAgo(5),
//     entityId: 'wf_047',
//     entityName: 'process-refund',
//     status: 'pending',
//     user: 'ai-generator',
//   },
//   {
//     id: 'act_8',
//     type: 'workflow_executed',
//     title: 'Batch Processing',
//     description: 'sync-user-profiles processed 2,847 records',
//     timestamp: hoursAgo(6),
//     entityId: 'wf_008',
//     entityName: 'sync-user-profiles',
//     status: 'active',
//     user: 'system',
//   },
// ];
//
// export const mockAISuggestions: AISuggestion[] = [
//   {
//     id: 'sug_1',
//     type: 'missing_workflow',
//     title: 'Missing Refund Handler',
//     description: 'Schema contains a "Refund" entity but no workflow handles refund processing. Would you like to generate one?',
//     priority: 'high',
//     actionLabel: 'Generate Workflow',
//   },
//   {
//     id: 'sug_2',
//     type: 'optimization',
//     title: 'Slow Endpoint Detected',
//     description: 'get-inventory-report averages 4.2s latency. AI suggests adding caching layer.',
//     priority: 'medium',
//     actionLabel: 'Optimize',
//     entityId: 'wf_005',
//   },
//   {
//     id: 'sug_3',
//     type: 'tool_sync',
//     title: 'Tool Out of Sync',
//     description: 'fetch-customer-details tool schema changed in n8n 3 days ago. Sync recommended.',
//     priority: 'medium',
//     actionLabel: 'Sync Now',
//     entityId: 'tool_003',
//   },
//   {
//     id: 'sug_4',
//     type: 'schema_update',
//     title: 'Schema Drift Detected',
//     description: 'Production DB has 2 new columns not in uploaded schema. Re-analyze recommended.',
//     priority: 'low',
//     actionLabel: 'Re-analyze',
//   },
// ];
//
// function generateTimeSeries(days: number, baseValue: number, variance: number): TimeSeriesDataPoint[] {
//   return Array.from({ length: days }, (_, i) => {
//     const date = new Date(now.getTime() - (days - 1 - i) * 86400000);
//     const value = Math.max(0, Math.round(baseValue + (Math.random() - 0.5) * variance));
//     return { date: date.toISOString().split('T')[0], value };
//   });
// }
//
// export const mockWorkflowUsageTimeSeries = generateTimeSeries(30, 3200, 800);
// export const mockSuccessRateTimeSeries = generateTimeSeries(30, 98, 4).map((d) => ({
//   ...d,
//   value: Math.min(100, Math.max(90, d.value)),
// }));
// export const mockEndpointCallsTimeSeries = generateTimeSeries(30, 5400, 1200);
// export const mockVoiceSessionsTimeSeries = generateTimeSeries(30, 45, 20);
