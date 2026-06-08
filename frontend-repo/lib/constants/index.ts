import type { NavItem, SelectOption } from '@/lib/types';

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/dashboard' },
  { id: 'schema', label: 'Schema Manager', icon: 'Database', href: '/schema' },
  { id: 'schema-review', label: 'AI Review', icon: 'BrainCircuit', href: '/schema/review' },
  { id: 'workflows', label: 'Workflows', icon: 'Workflow', href: '/workflows' },
  { id: 'tools', label: 'Tool Registry', icon: 'Wrench', href: '/tools' },
  { id: 'live-assistant', label: 'Live Assistant', icon: 'Mic', href: '/live-assistant' },
  { id: 'logs', label: 'Logs', icon: 'ScrollText', href: '/logs' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3', href: '/analytics' },
  { id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' },
];

export const ENDPOINT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'REST', label: 'REST API' },
  { value: 'WEBHOOK', label: 'Webhook' },
];

export const HTTP_METHOD_OPTIONS: SelectOption[] = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
];

export const GENERATION_MODE_OPTIONS: SelectOption[] = [
  { value: 'AI', label: 'Auto', description: 'AI generates complete workflow' },
  { value: 'GUIDED', label: 'Guided', description: 'AI suggests, you refine' },
  { value: 'MANUAL', label: 'Manual', description: 'Build from scratch' },
];

export const SCHEMA_FORMAT_OPTIONS: SelectOption[] = [
  { value: 'prisma', label: 'Prisma Schema (.prisma)' },
  { value: 'sql', label: 'SQL Schema (.sql)' },
  { value: 'json', label: 'JSON Schema (.json)' },
  { value: 'graphql', label: 'GraphQL SDL (.graphql)' },
];

export const STATUS_COLORS: Record<string, string> = {
  active: 'success',
  inactive: 'tertiary',
  pending: 'warning',
  pending_review: 'warning',
  error: 'error',
  draft: 'info',
  approved: 'success',
  rejected: 'error',
  healthy: 'success',
  degraded: 'warning',
  down: 'error',
  listening: 'accent',
  thinking: 'warning',
  speaking: 'success',
  idle: 'tertiary',
};

export const LOG_LEVEL_COLORS: Record<string, string> = {
  info: 'info',
  warning: 'warning',
  error: 'error',
  debug: 'tertiary',
  success: 'success',
};

export const WORKFLOW_NODE_TYPES = {
  webhook: { label: 'Webhook', color: '#00c8f8' },
  validation: { label: 'Validation', color: '#f5a623' },
  'business-logic': { label: 'Business Logic', color: '#7c6af7' },
  database: { label: 'Database Query', color: '#10d48a' },
  response: { label: 'Response', color: '#5ba4f5' },
  error: { label: 'Error Handler', color: '#f0455a' },
  transform: { label: 'Transform', color: '#e879f9' },
  condition: { label: 'Condition', color: '#f59e0b' },
} as const;

export const DATE_FORMAT_OPTIONS: SelectOption[] = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
];

export const TIMEZONE_OPTIONS: SelectOption[] = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Berlin', label: 'Central European (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard (JST)' },
  { value: 'Asia/Kolkata', label: 'India Standard (IST)' },
];

export const AI_MODEL_OPTIONS: SelectOption[] = [
  { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet (Recommended)' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku (Fast)' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
];

export const VOICE_PROVIDER_OPTIONS: SelectOption[] = [
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'openai', label: 'OpenAI TTS' },
  { value: 'azure', label: 'Azure Cognitive Speech' },
  { value: 'google', label: 'Google Text-to-Speech' },
];

export const PAGINATION_LIMITS = [10, 25, 50, 100] as const;

export const MOCK_LATENCY = {
  fast: 300,
  medium: 800,
  slow: 1500,
} as const;
