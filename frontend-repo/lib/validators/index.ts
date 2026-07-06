import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const forgotSchema = z.object({
  email: z.email('Invalid email format'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),

});

export const workflowGenerationSchema = z.object({
  // schemaId: z.string(),
  // capabilityId: z.string(),
  name: z.string().min(2).max(100),
  purpose: z.string().min(10).max(500),
  entities: z.array(z.string()).min(1),
  // endpoint: z.string(),
  endpointType: z.enum(['REST', 'WEBHOOK']),
  httpMethod: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE',]),
  generationMode: z.enum(['AI', 'GUIDED', 'MANUAL',]),
  requiresAuth: z.boolean(),
  isReadOnly: z.boolean(),
  enableCRUD: z.boolean(),
  strictValidation: z.boolean(),
  requiresApproval: z.boolean(),
});

export const workflowEditSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500),
  endpoint: z.string().min(1, 'Endpoint is required').startsWith('/', 'Endpoint must start with /'),
  httpMethod: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  requiresAuth: z.boolean(),
  tags: z.array(z.string()),
  changelog: z.string().min(1, 'Please describe what changed'),
});

export const toolEditSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(500),
  endpoint: z.string().url('Must be a valid URL'),
  workflowId: z.string().min(1, 'Please select a workflow'),
  tags: z.array(z.string()),
});

export const settingsGeneralSchema = z.object({
  platformName: z.string().min(2).max(100),
  adminEmail: z.string().email(),
  timezone: z.string().min(1),
  dateFormat: z.string().min(1),
  language: z.string().min(1),
});

export const settingsAISchema = z.object({
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(100).max(100000),
  confidenceThreshold: z.number().min(0).max(1),
  autoGenerate: z.boolean(),
  requireApproval: z.boolean(),
});

export const settingsN8nSchema = z.object({
  baseUrl: z.string().url('Must be a valid URL'),
  apiKey: z.string().min(1, 'API key is required'),
  webhookBaseUrl: z.string().url('Must be a valid URL'),
  autoSync: z.boolean(),
  syncInterval: z.number().min(1).max(3600),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotFormData = z.infer<typeof forgotSchema>;
export type WorkflowGenerationFormData = z.infer<typeof workflowGenerationSchema>;
export type WorkflowEditFormData = z.infer<typeof workflowEditSchema>;
export type ToolEditFormData = z.infer<typeof toolEditSchema>;
export type SettingsGeneralFormData = z.infer<typeof settingsGeneralSchema>;
export type SettingsAIFormData = z.infer<typeof settingsAISchema>;
export type SettingsN8nFormData = z.infer<typeof settingsN8nSchema>;
