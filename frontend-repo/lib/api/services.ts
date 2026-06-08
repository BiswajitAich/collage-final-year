import { sleep, generateId } from '@/lib/utils';
import { MOCK_LATENCY } from '@/lib/constants';
import { mockWorkflows } from './mock-data/workflow.data';
import { mockSchemas, mockTools, mockVoiceSession, mockLogs, mockAnalytics } from './mock-data/misc.data';
import type {
  Workflow, WorkflowGenerationRequest, UploadedSchema, Tool,
  VoiceSession, LogEntry, AnalyticsDashboard, FilterParams, PaginationParams
} from '@/lib/types';

// ===== WORKFLOW SERVICE =====

export const workflowService = {
  async getWorkflows(): Promise<Workflow[]> {
    await sleep(MOCK_LATENCY.medium);
    return mockWorkflows;
  },

  async getWorkflow(id: string): Promise<Workflow | null> {
    await sleep(MOCK_LATENCY.fast);
    return mockWorkflows.find((w) => w.id === id) ?? null;
  },

  async generateWorkflow(request: WorkflowGenerationRequest): Promise<Workflow> {
    await sleep(MOCK_LATENCY.slow * 2); // simulate AI generation
    const base = mockWorkflows[0];
    return {
      ...base,
      id: generateId('wf'),
      name: request.name.toLowerCase().replace(/\s+/g, '-'),
      description: `AI-generated workflow for: ${request.purpose}`,
      purpose: request.purpose,
      status: request.requiresApproval ? 'pending_review' : 'draft',
      endpointType: request.endpointType,
      httpMethod: request.httpMethod,
      endpoint: `/api/v1/${request.name.toLowerCase().replace(/\s+/g, '-')}`,
      requiresAuth: request.requiresAuth,
      generationMode: request.generationMode,
      entities: request.entities,
      executionCount: 0,
      successRate: 0,
      avgLatencyMs: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [],
      toolMappings: [],
      tags: ['ai-generated'],
    };
  },

  async approveWorkflow(id: string): Promise<Workflow> {
    await sleep(MOCK_LATENCY.fast);
    const wf = mockWorkflows.find((w) => w.id === id);
    if (!wf) throw new Error('Workflow not found');
    return { ...wf, status: 'approved', approvedAt: new Date().toISOString(), approvedBy: 'admin' };
  },

  async activateWorkflow(id: string): Promise<Workflow> {
    await sleep(MOCK_LATENCY.fast);
    const wf = mockWorkflows.find((w) => w.id === id);
    if (!wf) throw new Error('Workflow not found');
    return { ...wf, status: 'active' };
  },

  async deactivateWorkflow(id: string): Promise<Workflow> {
    await sleep(MOCK_LATENCY.fast);
    const wf = mockWorkflows.find((w) => w.id === id);
    if (!wf) throw new Error('Workflow not found');
    return { ...wf, status: 'inactive' };
  },

  async deleteWorkflow(id: string): Promise<void> {
    await sleep(MOCK_LATENCY.fast);
  },
};

// ===== SCHEMA SERVICE =====

export const schemaService = {
  async getSchemas(): Promise<UploadedSchema[]> {
    await sleep(MOCK_LATENCY.medium);
    return mockSchemas;
  },

  async getSchema(id: string): Promise<UploadedSchema | null> {
    await sleep(MOCK_LATENCY.fast);
    return mockSchemas.find((s) => s.id === id) ?? null;
  },

  async uploadSchema(file: File | string, name: string, format: string): Promise<UploadedSchema> {
    await sleep(MOCK_LATENCY.slow);
    const base = mockSchemas[0];
    return {
      ...base,
      id: generateId('schema'),
      name,
      format: format as UploadedSchema['format'],
      uploadedAt: new Date().toISOString(),
      status: 'analyzed',
    };
  },

  async analyzeSchema(id: string): Promise<UploadedSchema> {
    await sleep(MOCK_LATENCY.slow * 1.5);
    return mockSchemas[0];
  },

  async deleteSchema(id: string): Promise<void> {
    await sleep(MOCK_LATENCY.fast);
  },
};

// ===== TOOL SERVICE =====

export const toolService = {
  async getTools(params?: { search?: string; status?: string }): Promise<Tool[]> {
    await sleep(MOCK_LATENCY.medium);
    let tools = [...mockTools];
    if (params?.search) {
      const q = params.search.toLowerCase();
      tools = tools.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }
    if (params?.status && params.status !== 'all') {
      tools = tools.filter((t) => t.status === params.status);
    }
    return tools;
  },

  async getTool(id: string): Promise<Tool | null> {
    await sleep(MOCK_LATENCY.fast);
    return mockTools.find((t) => t.id === id) ?? null;
  },

  async syncTool(id: string): Promise<Tool> {
    await sleep(MOCK_LATENCY.slow);
    const tool = mockTools.find((t) => t.id === id);
    if (!tool) throw new Error('Tool not found');
    return { ...tool, lastSync: new Date().toISOString(), status: 'active' };
  },

  async testTool(id: string): Promise<{ success: boolean; latencyMs: number; response: unknown }> {
    await sleep(MOCK_LATENCY.medium);
    return { success: true, latencyMs: Math.floor(Math.random() * 100 + 20), response: { status: 'ok', message: 'Tool test successful' } };
  },

  async toggleTool(id: string, enabled: boolean): Promise<Tool> {
    await sleep(MOCK_LATENCY.fast);
    const tool = mockTools.find((t) => t.id === id);
    if (!tool) throw new Error('Tool not found');
    return { ...tool, status: enabled ? 'active' : 'inactive' };
  },
};

// ===== ASSISTANT SERVICE =====

export const assistantService = {
  async getActiveSession(): Promise<VoiceSession> {
    await sleep(MOCK_LATENCY.fast);
    return mockVoiceSession;
  },

  async getSessions(limit = 10): Promise<VoiceSession[]> {
    await sleep(MOCK_LATENCY.medium);
    return Array.from({ length: Math.min(limit, 8) }, (_, i) => ({
      ...mockVoiceSession,
      id: `session_${String(i + 1).padStart(3, '0')}`,
      startTime: new Date(Date.now() - i * 3600000).toISOString(),
      endTime: new Date(Date.now() - i * 3600000 + 480000).toISOString(),
      status: 'idle' as const,
      messageCount: Math.floor(Math.random() * 20 + 5),
      toolCallCount: Math.floor(Math.random() * 8),
      successRate: Math.round(Math.random() * 20 + 80),
    }));
  },
};

// ===== LOG SERVICE =====

export const logService = {
  async getLogs(params?: { search?: string; status?: string; page?: number; limit?: number }): Promise<{ logs: LogEntry[]; total: number }> {
    await sleep(MOCK_LATENCY.fast);
    let logs = [...mockLogs];

    if (params?.search) {
      const q = params.search.toLowerCase();
      logs = logs.filter(
        (l) => l.message.toLowerCase().includes(q) || l.component.toLowerCase().includes(q) || l.event.toLowerCase().includes(q)
      );
    }
    if (params?.status) {
      logs = logs.filter((l) => l.level === params.status);
    }

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 25;
    const total = logs.length;
    const paginated = logs.slice((page - 1) * limit, page * limit);

    return { logs: paginated, total };
  },

  async exportLogs(format: 'csv' | 'json'): Promise<string> {
    await sleep(MOCK_LATENCY.medium);
    if (format === 'json') return JSON.stringify(mockLogs, null, 2);
    const headers = 'timestamp,level,component,event,message\n';
    const rows = mockLogs.map((l) => `${l.timestamp},${l.level},${l.component},${l.event},"${l.message}"`).join('\n');
    return headers + rows;
  },
};

// ===== ANALYTICS SERVICE =====

export const analyticsService = {
  async getDashboard(dateRange?: { start: string; end: string }): Promise<AnalyticsDashboard> {
    await sleep(MOCK_LATENCY.medium);
    return mockAnalytics;
  },
};
