import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User, Workflow, UploadedSchema, Tool, VoiceSession,
  DashboardStats, RecentActivity, AISuggestion, Toast,
  LogEntry, AnalyticsDashboard, AppSettings
} from '@/lib/types';
import { WorkflowGraphData } from '@/app/(dashboard)/workflows/new/action';

// ===== AUTH STORE =====

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: 'auth-store', partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }) }
  )
);

// ===== DASHBOARD STORE =====

interface DashboardStore {
  stats: DashboardStats | null;
  recentActivity: RecentActivity[];
  aiSuggestions: AISuggestion[];
  isLoading: boolean;
  error: string | null;
  setStats: (stats: DashboardStats) => void;
  setRecentActivity: (activity: RecentActivity[]) => void;
  setAISuggestions: (suggestions: AISuggestion[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  stats: null,
  recentActivity: [],
  aiSuggestions: [],
  isLoading: false,
  error: null,
  setStats: (stats) => set({ stats }),
  setRecentActivity: (recentActivity) => set({ recentActivity }),
  setAISuggestions: (aiSuggestions) => set({ aiSuggestions }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

// ===== WORKFLOW STORE =====

interface WorkflowStore {
  workflows: WorkflowGraphData[];
  selectedWorkflow: WorkflowGraphData | null;
  generatedWorkflow: WorkflowGraphData | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  setWorkflows: (workflows: WorkflowGraphData[]) => void;
  setSelectedWorkflow: (workflow: WorkflowGraphData | null) => void;
  setGeneratedWorkflow: (workflow: WorkflowGraphData | null) => void;
  updateWorkflow: (id: string, updates: Partial<WorkflowGraphData>) => void;
  addWorkflow: (workflow: WorkflowGraphData) => void;
  removeWorkflow: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  workflows: [],
  selectedWorkflow: null,
  generatedWorkflow: null,
  isLoading: false,
  isGenerating: false,
  error: null,
  setWorkflows: (workflows) => set({ workflows }),
  setSelectedWorkflow: (selectedWorkflow) => set({ selectedWorkflow }),
  setGeneratedWorkflow: (generatedWorkflow) => set({ generatedWorkflow }),
  updateWorkflow: (id, updates) =>
    set((state) => ({
      workflows: state.workflows.map((w) => (w.id === id ? { ...w, ...updates } : w)),
      selectedWorkflow: state.selectedWorkflow?.id === id ? { ...state.selectedWorkflow, ...updates } : state.selectedWorkflow,
    })),
  addWorkflow: (workflow) => set((state) => ({ workflows: [workflow, ...state.workflows] })),
  removeWorkflow: (id) =>
    set((state) => ({
      workflows: state.workflows.filter((w) => w.id !== id),
      selectedWorkflow: state.selectedWorkflow?.id === id ? null : state.selectedWorkflow,
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setError: (error) => set({ error }),
}));

// ===== SCHEMA STORE =====

interface SchemaStore {
  schemas: UploadedSchema[];
  selectedSchema: UploadedSchema | null;
  isLoading: boolean;
  isUploading: boolean;
  isAnalyzing: boolean;
  error: string | null;
  setSchemas: (schemas: UploadedSchema[]) => void;
  setSelectedSchema: (schema: UploadedSchema | null) => void;
  addSchema: (schema: UploadedSchema) => void;
  removeSchema: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setUploading: (uploading: boolean) => void;
  setAnalyzing: (analyzing: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSchemaStore = create<SchemaStore>((set) => ({
  schemas: [],
  selectedSchema: null,
  isLoading: false,
  isUploading: false,
  isAnalyzing: false,
  error: null,
  setSchemas: (schemas) => set({ schemas }),
  setSelectedSchema: (selectedSchema) => set({ selectedSchema }),
  addSchema: (schema) => set((state) => ({ schemas: [schema, ...state.schemas] })),
  removeSchema: (id) =>
    set((state) => ({
      schemas: state.schemas.filter((s) => s.id !== id),
      selectedSchema: state.selectedSchema?.id === id ? null : state.selectedSchema,
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setUploading: (isUploading) => set({ isUploading }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setError: (error) => set({ error }),
}));

// ===== TOOL STORE =====

interface ToolStore {
  tools: Tool[];
  selectedTool: Tool | null;
  isLoading: boolean;
  error: string | null;
  setTools: (tools: Tool[]) => void;
  setSelectedTool: (tool: Tool | null) => void;
  updateTool: (id: string, updates: Partial<Tool>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useToolStore = create<ToolStore>((set) => ({
  tools: [],
  selectedTool: null,
  isLoading: false,
  error: null,
  setTools: (tools) => set({ tools }),
  setSelectedTool: (selectedTool) => set({ selectedTool }),
  updateTool: (id, updates) =>
    set((state) => ({
      tools: state.tools.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

// ===== ASSISTANT STORE =====

interface AssistantStore {
  session: VoiceSession | null;
  sessions: VoiceSession[];
  isLoading: boolean;
  setSession: (session: VoiceSession | null) => void;
  setSessions: (sessions: VoiceSession[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useAssistantStore = create<AssistantStore>((set) => ({
  session: null,
  sessions: [],
  isLoading: false,
  setSession: (session) => set({ session }),
  setSessions: (sessions) => set({ sessions }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// ===== SETTINGS STORE =====

const defaultSettings: AppSettings = {
  general: {
    platformName: 'AI Workflow Platform',
    adminEmail: 'admin@company.com',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    language: 'en',
  },
  ai: {
    model: 'claude-3-5-sonnet',
    temperature: 0.3,
    maxTokens: 4096,
    confidenceThreshold: 0.85,
    autoGenerate: true,
    requireApproval: true,
  },
  workflow: {
    defaultEndpointType: 'REST',
    defaultAuthRequired: true,
    autoVersioning: true,
    maxVersionsKept: 10,
    executionTimeout: 30,
    retryAttempts: 3,
  },
  voice: {
    provider: 'elevenlabs',
    model: 'eleven_monolingual_v1',
    voice: 'Rachel',
    language: 'en-US',
    maxSessionDuration: 3600,
    silenceTimeout: 10,
    enableTranscription: true,
  },
  n8n: {
    baseUrl: 'https://n8n.company.com',
    apiKey: '',
    webhookBaseUrl: 'https://n8n.company.com/webhook',
    autoSync: true,
    syncInterval: 300,
  },
  security: {
    enableMFA: false,
    sessionTimeout: 3600,
    ipWhitelist: [],
    jwtExpiry: 86400,
    enableAuditLog: true,
  },
};

interface SettingsStore {
  settings: AppSettings;
  isDirty: boolean;
  isSaving: boolean;
  updateSettings: (section: keyof AppSettings, values: Partial<AppSettings[keyof AppSettings]>) => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isDirty: false,
      isSaving: false,
      updateSettings: (section, values) =>
        set((state) => ({
          settings: { ...state.settings, [section]: { ...state.settings[section as keyof AppSettings], ...values } },
          isDirty: true,
        })),
      saveSettings: async () => {
        set({ isSaving: true });
        await new Promise((r) => setTimeout(r, 800));
        set({ isSaving: false, isDirty: false });
      },
      resetSettings: () => set({ settings: defaultSettings, isDirty: false }),
    }),
    { name: 'settings-store' }
  )
);

// ===== UI / TOAST STORE =====

interface UIStore {
  toasts: Toast[];
  isSidebarCollapsed: boolean;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  toasts: [],
  isSidebarCollapsed: false,
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: Math.random().toString(36).substring(2) }],
    })),
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
}));
