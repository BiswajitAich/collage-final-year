// ===== CORE ENTITY TYPES =====

import { WorkflowGraphData } from "@/app/(dashboard)/workflows/workflow.schema";
import type { EndpointType, GenerationMode, HttpMethod, LogLevel, Prisma, SchemaFormat, SchemaStatus, ToolStatus, WorkflowStatus } from "../generated/prisma/client";

// export type Status = 'active' | 'inactive' | 'pending' | 'error' | 'draft' | 'approved' | 'rejected';
// export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
// export type LogLevel = 'info' | 'warning' | 'error' | 'debug' | 'success';
// export type EndpointType = 'REST' | 'Webhook';
// export type SchemaFormat = 'prisma' | 'sql' | 'json' | 'graphql';
// export type GenerationMode = 'auto' | 'guided' | 'manual';
// export type WorkflowStatus = 'draft' | 'pending_review' | 'active' | 'inactive' | 'failed';
// export type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking';
// export type ToolStatus = 'active' | 'inactive' | 'syncing' | 'error';

// ===== USER & AUTH =====

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'developer' | 'viewer';
  avatar?: string;
  createdAt: string;
  lastLogin: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ===== SCHEMA TYPES =====


export interface SchemaField {
  name: string;
  type: string;
  isRequired: boolean;
  isUnique: boolean;
  isPrimary: boolean;
  isForeign: boolean;
  defaultValue?: string;
  description?: string;
}

export interface SchemaEntity {
  id: string;
  name: string;
  tableName: string;
  fields: SchemaField[];
  fieldCount: number;
  description?: string;
  isJunction: boolean;
}

export interface SchemaRelationship {
  id: string;
  fromEntity: string;
  toEntity: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  fieldName: string;
  description?: string;
  confidence: number;
}

export type UploadedSchemaDB =
  Prisma.UploadedSchemaGetPayload<{}>;

export interface UploadedSchema {
  id: string;
  name: string;
  format: SchemaFormat;
  parsedJson: Prisma.JsonValue | null;
  rawContent: string;
  uploadedAt: string;
  status: SchemaStatus;
  entityCount: number;
  relationshipCount: number;
  analysisResult: Prisma.JsonValue | null;
  entities: SchemaEntity[];
  relationships: SchemaRelationship[];
}

export interface SchemaAnalysis {
  schemaId: string;
  analyzedAt: string;
  entities: SchemaEntity[];
  relationships: SchemaRelationship[];
  inferredDomain: string;
  inferredActions: InferredAction[];
  businessRules: BusinessRule[];
  confidence: number;
  suggestions: string[];
}

export interface InferredAction {
  id: string;
  name: string;
  description: string;
  entities: string[];
  type: 'create' | 'read' | 'update' | 'delete' | 'process' | 'validate';
  confidence: number;
}

export interface BusinessRule {
  id: string;
  rule: string;
  entities: string[];
  confidence: number;
}

// ===== WORKFLOW TYPES =====

// export interface WorkflowNode {
//   id: string;
//   type: 'webhook' | 'validation' | 'business-logic' | 'database' | 'response' | 'error' | 'transform' | 'condition';
//   label: string;
//   description: string;
//   position: { x: number; y: number };
//   inputs: NodePort[];
//   outputs: NodePort[];
//   config: Record<string, unknown>;
//   metadata: {
//     tool?: string;
//     entity?: string;
//     method?: HttpMethod;
//     schema?: string;
//   };
// }

export interface NodePort {
  id: string;
  name: string;
  type: string;
  description?: string;
}

// export interface WorkflowEdge {
//   id: string;
//   source: string;
//   target: string;
//   sourceHandle?: string;
//   targetHandle?: string;
//   label?: string;
//   type?: string;
// }

// export interface WorkflowNode {
//   id: string;

//   type:
//     | 'webhook'
//     | 'validation'
//     | 'business-logic'
//     | 'database'
//     | 'response'
//     | 'error'
//     | 'transform'
//     | 'condition';

//   label: string;
//   description?: string;

//   position: {
//     x: number;
//     y: number;
//   };

//   inputs: NodePort[];
//   outputs: NodePort[];

//   config: Record<string, unknown>;

//   metadata?: {
//     tool?: string;
//     entity?: string;
//     method?: HttpMethod;
//     schema?: string;
//   };
// }

export interface WorkflowValidation {
  field: string;
  rule: string;
  message: string;
  type: 'required' | 'format' | 'range' | 'custom';
}

export interface Workflow {
  id: string;
  name: string;
  description?: string | null;
  purpose?: string | null;
  status: WorkflowStatus;
  endpointType: EndpointType;
  httpMethod: HttpMethod;
  endpoint: string;
  requiresAuth: boolean;
  generationMode: GenerationMode;
  workflowJson: WorkflowGraphData | null;
  executionCount: number;
  successRate: number;
  avgLatencyMs: number;
  n8nWorkflowId?: String;
  n8nWorkflowJson?: Prisma.JsonValue;
  approvedAt: Date | null;
  approvedById: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowGenerationRequest {
  name: string;
  purpose: string;
  entities: string[];
  endpointType: EndpointType;
  httpMethod: HttpMethod;
  requiresAuth: boolean;
  generationMode: GenerationMode;
  isReadOnly: boolean;
  enableCRUD: boolean;
  strictValidation: boolean;
  requiresApproval: boolean;
}

// ===== TOOL TYPES =====

export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  defaultValue?: string | number | boolean;
  enum?: string[];
}

export interface ToolMapping {
  toolId: string;
  toolName: string;
  workflowId: string;
  triggerCondition: string;
  priority: number;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  workflowId: string;
  workflowName: string;
  status: ToolStatus;
  parameters: ToolParameter[];
  lastSync: string;
  lastUsed?: string;
  usageCount: number;
  successRate: number;
  category: string;
  version: string;
  tags: string[];
}

// ===== VOICE ASSISTANT TYPES =====

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  latencyMs?: number;
  confidence?: number;
}

export interface ToolCall {
  id: string;
  toolName: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'success' | 'error';
  latencyMs?: number;
}

export interface VoiceSession {
  id: string;
  startTime: string;
  endTime?: string;
  status: WorkflowStatus;
  duration?: number;
  messageCount: number;
  toolCallCount: number;
  userId?: string;
  transcript: TranscriptMessage[];
  activeTools: string[];
  strategy?: string;
  successRate: number;
}

// ===== LOG TYPES =====

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  component: string;
  event: string;
  message: string;
  workflowId?: string;
  workflowName?: string;
  sessionId?: string;
  metadata: Record<string, unknown>;
  duration?: number;
  statusCode?: number;
}

// ===== ANALYTICS TYPES =====

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  unit?: string;
}

export interface WorkflowUsageData {
  workflowId: string;
  workflowName: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
  successRate: number;
}

export interface ToolUsageData {
  toolId: string;
  toolName: string;
  callCount: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
}

export interface AnalyticsDashboard {
  period: { start: string; end: string };
  metrics: AnalyticsMetric[];
  workflowUsage: TimeSeriesDataPoint[];
  toolUsage: ToolUsageData[];
  successRate: TimeSeriesDataPoint[];
  endpointCalls: TimeSeriesDataPoint[];
  voiceSessions: TimeSeriesDataPoint[];
  topWorkflows: WorkflowUsageData[];
  errorRate: TimeSeriesDataPoint[];
}

// ===== DASHBOARD TYPES =====

export interface DashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  activeEndpoints: number;
  registeredTools: number;
  voiceSessions: number;
  pendingApprovals: number;
  uploadedSchemas: number;
  totalExecutions: number;
  avgSuccessRate: number;
  systemHealth: SystemHealth;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  latencyMs: number;
  activeConnections: number;
  queueDepth: number;
  services: ServiceHealth[];
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  uptime: number;
}

export interface RecentActivity {
  id: string;
  type: 'workflow_created' | 'schema_uploaded' | 'tool_synced' | 'voice_session' | 'approval_needed' | 'workflow_executed' | 'error';
  title: string;
  description: string;
  timestamp: string;
  entityId?: string;
  entityName?: string;
  status?: WorkflowStatus;
  user?: string;
}

export interface AISuggestion {
  id: string;
  type: 'optimization' | 'missing_workflow' | 'tool_sync' | 'schema_update';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
  entityId?: string;
}

// ===== SETTINGS TYPES =====

export interface GeneralSettings {
  platformName: string;
  adminEmail: string;
  timezone: string;
  dateFormat: string;
  language: string;
}

export interface AISettings {
  model: string;
  temperature: number;
  maxTokens: number;
  confidenceThreshold: number;
  autoGenerate: boolean;
  requireApproval: boolean;
}

export interface WorkflowSettings {
  defaultEndpointType: EndpointType;
  defaultAuthRequired: boolean;
  autoVersioning: boolean;
  maxVersionsKept: number;
  executionTimeout: number;
  retryAttempts: number;
}

export interface VoiceSettings {
  provider: string;
  model: string;
  voice: string;
  language: string;
  maxSessionDuration: number;
  silenceTimeout: number;
  enableTranscription: boolean;
}

export interface N8nSettings {
  baseUrl: string;
  apiKey: string;
  webhookBaseUrl: string;
  autoSync: boolean;
  syncInterval: number;
}

export interface SecuritySettings {
  enableMFA: boolean;
  sessionTimeout: number;
  ipWhitelist: string[];
  jwtExpiry: number;
  enableAuditLog: boolean;
}

export interface AppSettings {
  general: GeneralSettings;
  ai: AISettings;
  workflow: WorkflowSettings;
  voice: VoiceSettings;
  n8n: N8nSettings;
  security: SecuritySettings;
}

// ===== API TYPES =====

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ===== UI TYPES =====

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: T) => React.ReactNode;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
  children?: NavItem[];
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// === Parsing ===

export interface ParsedField {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  isArray: boolean;
}

export interface ParsedEntity {
  name: string;
  fields: ParsedField[];
}

export interface ParsedRelationship {
  from: string;
  to: string;
  fieldName: string;
  foreignKeys?: string[];
  references?: string[];
  relationType:
  | "one-to-one"
  | "one-to-many"
  | "many-to-one"
  | "many-to-many";
}

export interface ParsedSchema {
  entities: ParsedEntity[];
  relationships: ParsedRelationship[];
  enums: ParsedEnum[];
}

export interface ParsedEnum {
  name: string;
  values: string[];
}

export interface RawRelationship {
  from: string;
  to: string;
  field: string;
  fkIsPk: boolean;
  fkIsUnique: boolean;
}

export interface PrismaRelationField {
  fieldName: string;
  targetModel: string;
  isList: boolean;
  isOptional: boolean;
  relationName?: string;
  fields?: string[];
  references?: string[];
}