import type { UploadedSchema, Tool, VoiceSession, TranscriptMessage, LogEntry, AnalyticsDashboard } from '@/lib/types';

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
const minutesAgo = (n: number) => new Date(now.getTime() - n * 60000).toISOString();
const secondsAgo = (n: number) => new Date(now.getTime() - n * 1000).toISOString();

// ===== SCHEMAS =====

export const mockSchemas: UploadedSchema[] = [
  {
    id: 'schema_001',
    name: 'ecommerce-core.prisma',
    format: 'prisma',
    uploadedAt: daysAgo(5),
    status: 'analyzed',
    entityCount: 14,
    relationshipCount: 18,
    content: `model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String
  orders    Order[]
  createdAt DateTime  @default(now())
}

model Product {
  id          String      @id @default(cuid())
  name        String
  sku         String      @unique
  price       Decimal
  inventory   Inventory?
  orderItems  OrderItem[]
  categoryId  String
  category    Category    @relation(fields: [categoryId], references: [id])
}

model Order {
  id         String      @id @default(cuid())
  userId     String
  user       User        @relation(fields: [userId], references: [id])
  items      OrderItem[]
  status     OrderStatus @default(PENDING)
  total      Decimal
  createdAt  DateTime    @default(now())
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id])
  productId String
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  price     Decimal
}

model Inventory {
  id        String  @id @default(cuid())
  productId String  @unique
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  reserved  Int     @default(0)
}

model Category {
  id       String    @id @default(cuid())
  name     String
  slug     String    @unique
  products Product[]
}`,
    entities: [
      {
        id: 'ent_1', name: 'User', tableName: 'users', fieldCount: 5, isJunction: false,
        description: 'Platform user/customer',
        fields: [
          { name: 'id', type: 'String', isRequired: true, isUnique: true, isPrimary: true, isForeign: false },
          { name: 'email', type: 'String', isRequired: true, isUnique: true, isPrimary: false, isForeign: false },
          { name: 'name', type: 'String', isRequired: true, isUnique: false, isPrimary: false, isForeign: false },
          { name: 'createdAt', type: 'DateTime', isRequired: true, isUnique: false, isPrimary: false, isForeign: false },
        ],
      },
      {
        id: 'ent_2', name: 'Product', tableName: 'products', fieldCount: 7, isJunction: false,
        description: 'Sellable product in the catalog',
        fields: [
          { name: 'id', type: 'String', isRequired: true, isUnique: true, isPrimary: true, isForeign: false },
          { name: 'name', type: 'String', isRequired: true, isUnique: false, isPrimary: false, isForeign: false },
          { name: 'sku', type: 'String', isRequired: true, isUnique: true, isPrimary: false, isForeign: false },
          { name: 'price', type: 'Decimal', isRequired: true, isUnique: false, isPrimary: false, isForeign: false },
          { name: 'categoryId', type: 'String', isRequired: true, isUnique: false, isPrimary: false, isForeign: true },
        ],
      },
      {
        id: 'ent_3', name: 'Order', tableName: 'orders', fieldCount: 6, isJunction: false,
        description: 'Customer purchase order',
        fields: [
          { name: 'id', type: 'String', isRequired: true, isUnique: true, isPrimary: true, isForeign: false },
          { name: 'userId', type: 'String', isRequired: true, isUnique: false, isPrimary: false, isForeign: true },
          { name: 'status', type: 'OrderStatus', isRequired: true, isUnique: false, isPrimary: false, isForeign: false },
          { name: 'total', type: 'Decimal', isRequired: true, isUnique: false, isPrimary: false, isForeign: false },
        ],
      },
      {
        id: 'ent_4', name: 'OrderItem', tableName: 'order_items', fieldCount: 5, isJunction: true,
        description: 'Line item in an order',
        fields: [
          { name: 'id', type: 'String', isRequired: true, isUnique: true, isPrimary: true, isForeign: false },
          { name: 'orderId', type: 'String', isRequired: true, isUnique: false, isPrimary: false, isForeign: true },
          { name: 'productId', type: 'String', isRequired: true, isUnique: false, isPrimary: false, isForeign: true },
          { name: 'quantity', type: 'Int', isRequired: true, isUnique: false, isPrimary: false, isForeign: false },
          { name: 'price', type: 'Decimal', isRequired: true, isUnique: false, isPrimary: false, isForeign: false },
        ],
      },
      {
        id: 'ent_5', name: 'Inventory', tableName: 'inventories', fieldCount: 4, isJunction: false,
        description: 'Stock levels for products',
        fields: [
          { name: 'id', type: 'String', isRequired: true, isUnique: true, isPrimary: true, isForeign: false },
          { name: 'productId', type: 'String', isRequired: true, isUnique: true, isPrimary: false, isForeign: true },
          { name: 'quantity', type: 'Int', isRequired: true, isUnique: false, isPrimary: false, isForeign: false },
          { name: 'reserved', type: 'Int', isRequired: true, isUnique: false, isPrimary: false, isForeign: false },
        ],
      },
      {
        id: 'ent_6', name: 'Category', tableName: 'categories', fieldCount: 3, isJunction: false,
        description: 'Product classification category',
        fields: [
          { name: 'id', type: 'String', isRequired: true, isUnique: true, isPrimary: true, isForeign: false },
          { name: 'name', type: 'String', isRequired: true, isUnique: false, isPrimary: false, isForeign: false },
          { name: 'slug', type: 'String', isRequired: true, isUnique: true, isPrimary: false, isForeign: false },
        ],
      },
    ],
    relationships: [
      { id: 'rel_1', fromEntity: 'User', toEntity: 'Order', type: 'one-to-many', fieldName: 'orders', confidence: 0.99 },
      { id: 'rel_2', fromEntity: 'Order', toEntity: 'OrderItem', type: 'one-to-many', fieldName: 'items', confidence: 0.99 },
      { id: 'rel_3', fromEntity: 'Product', toEntity: 'OrderItem', type: 'one-to-many', fieldName: 'orderItems', confidence: 0.99 },
      { id: 'rel_4', fromEntity: 'Product', toEntity: 'Inventory', type: 'one-to-one', fieldName: 'inventory', confidence: 0.97 },
      { id: 'rel_5', fromEntity: 'Category', toEntity: 'Product', type: 'one-to-many', fieldName: 'products', confidence: 0.99 },
    ],
  },
];

// ===== TOOLS =====

export const mockTools: Tool[] = [
  {
    id: 'tool_001', name: 'create-order', description: 'Creates a new customer order with items and payment',
    endpoint: 'https://n8n.company.com/webhook/create-order',
    workflowId: 'wf_001', workflowName: 'create-order',
    status: 'active', lastSync: minutesAgo(15), lastUsed: minutesAgo(3),
    usageCount: 4821, successRate: 99.1, category: 'Orders', version: '1.2.0',
    tags: ['orders', 'critical'],
    parameters: [
      { name: 'customerId', type: 'string', description: 'Customer UUID', required: true },
      { name: 'items', type: 'array', description: 'Order line items', required: true },
      { name: 'shippingAddress', type: 'object', description: 'Delivery address', required: true },
    ],
  },
  {
    id: 'tool_002', name: 'fetch-product-catalog', description: 'Returns paginated product listing with filters',
    endpoint: 'https://n8n.company.com/webhook/products',
    workflowId: 'wf_002', workflowName: 'get-product-catalog',
    status: 'active', lastSync: minutesAgo(30), lastUsed: minutesAgo(1),
    usageCount: 12049, successRate: 99.8, category: 'Products', version: '2.0.0',
    tags: ['products', 'catalog'],
    parameters: [
      { name: 'search', type: 'string', description: 'Search term', required: false },
      { name: 'categoryId', type: 'string', description: 'Filter by category', required: false },
      { name: 'page', type: 'number', description: 'Page number', required: false, defaultValue: 1 },
      { name: 'limit', type: 'number', description: 'Items per page', required: false, defaultValue: 20 },
    ],
  },
  {
    id: 'tool_003', name: 'get-customer-profile', description: 'Fetches customer data and order history',
    endpoint: 'https://n8n.company.com/webhook/customers/{id}',
    workflowId: 'wf_006', workflowName: 'get-customer-profile',
    status: 'active', lastSync: daysAgo(1), lastUsed: minutesAgo(8),
    usageCount: 8341, successRate: 99.6, category: 'Customers', version: '1.0.2',
    tags: ['customers', 'profile'],
    parameters: [
      { name: 'customerId', type: 'string', description: 'Customer UUID', required: true },
      { name: 'includeOrders', type: 'boolean', description: 'Include order history', required: false, defaultValue: false },
    ],
  },
  {
    id: 'tool_004', name: 'check-inventory', description: 'Real-time inventory check for one or more products',
    endpoint: 'https://n8n.company.com/webhook/inventory/check',
    workflowId: 'wf_004', workflowName: 'update-inventory',
    status: 'active', lastSync: daysAgo(2), lastUsed: minutesAgo(5),
    usageCount: 6214, successRate: 98.9, category: 'Inventory', version: '1.1.0',
    tags: ['inventory'],
    parameters: [
      { name: 'productIds', type: 'array', description: 'List of product IDs', required: true },
    ],
  },
  {
    id: 'tool_005', name: 'update-inventory', description: 'Adjusts stock levels for a product',
    endpoint: 'https://n8n.company.com/webhook/inventory/{productId}',
    workflowId: 'wf_004', workflowName: 'update-inventory',
    status: 'active', lastSync: daysAgo(3), lastUsed: minutesAgo(20),
    usageCount: 3892, successRate: 97.4, category: 'Inventory', version: '1.3.1',
    tags: ['inventory', 'critical'],
    parameters: [
      { name: 'productId', type: 'string', description: 'Product UUID', required: true },
      { name: 'delta', type: 'number', description: 'Quantity change (+/-)', required: true },
      { name: 'reason', type: 'string', description: 'Adjustment reason', required: false },
    ],
  },
  {
    id: 'tool_006', name: 'send-notification', description: 'Sends email, SMS, or push notification to customer',
    endpoint: 'https://n8n.company.com/webhook/notifications',
    workflowId: 'wf_005', workflowName: 'send-notification',
    status: 'error', lastSync: daysAgo(1), lastUsed: minutesAgo(180),
    usageCount: 2104, successRate: 91.2, category: 'Notifications', version: '1.1.0',
    tags: ['notifications'],
    parameters: [
      { name: 'customerId', type: 'string', description: 'Target customer', required: true },
      { name: 'template', type: 'string', description: 'Notification template', required: true },
      { name: 'channel', type: 'string', description: 'email | sms | push', required: true, enum: ['email', 'sms', 'push'] },
    ],
  },
];

// ===== VOICE SESSIONS =====

const mockTranscript: TranscriptMessage[] = [
  { id: 'msg_1', role: 'user', content: "Hi, I'd like to check on my recent order.", timestamp: secondsAgo(120), confidence: 0.97 },
  { id: 'msg_2', role: 'assistant', content: "I'd be happy to help you check your order status. Could you please provide me with your order ID or the email address associated with your account?", timestamp: secondsAgo(118) },
  {
    id: 'msg_3', role: 'user', content: 'My email is john@example.com', timestamp: secondsAgo(110), confidence: 0.99,
    toolCalls: [{ id: 'tc_1', toolName: 'get-customer-profile', parameters: { email: 'john@example.com' }, status: 'success', latencyMs: 38 }],
  },
  { id: 'msg_4', role: 'assistant', content: "I found your account, John! You have 3 recent orders. Your most recent order #ORD-2847 was placed yesterday for $124.99 and is currently being processed. Would you like more details on this order?", timestamp: secondsAgo(105), latencyMs: 420 },
  {
    id: 'msg_5', role: 'user', content: "Yes, and can you also check if the Blue Widget is in stock?", timestamp: secondsAgo(95), confidence: 0.95,
    toolCalls: [{ id: 'tc_2', toolName: 'check-inventory', parameters: { search: 'Blue Widget' }, status: 'success', latencyMs: 24 }],
  },
  { id: 'msg_6', role: 'assistant', content: "Great news! The Blue Widget is in stock with 47 units available. Would you like to add it to a new order, or is there anything else I can help you with?", timestamp: secondsAgo(88), latencyMs: 380 },
  { id: 'msg_7', role: 'user', content: "That's perfect. Please add one to my cart.", timestamp: secondsAgo(75), confidence: 0.98 },
  { id: 'msg_8', role: 'assistant', content: "I'll create that order for you right now...", timestamp: secondsAgo(73) },
];

export const mockVoiceSession: VoiceSession = {
  id: 'session_001',
  startTime: minutesAgo(8),
  status: 'listening',
  duration: 480,
  messageCount: 8,
  toolCallCount: 2,
  userId: 'user_external_001',
  transcript: mockTranscript,
  activeTools: ['get-customer-profile', 'check-inventory'],
  strategy: 'Customer Support — Order Inquiry',
  successRate: 100,
};

// ===== LOGS =====

export const mockLogs: LogEntry[] = [
  { id: 'log_001', timestamp: minutesAgo(1), level: 'success', component: 'WorkflowRunner', event: 'EXECUTION_COMPLETE', message: 'Workflow create-order executed in 42ms', workflowId: 'wf_001', workflowName: 'create-order', metadata: { requestId: 'req_abc123', userId: 'usr_001' }, duration: 42, statusCode: 201 },
  { id: 'log_002', timestamp: minutesAgo(2), level: 'info', component: 'AIEngine', event: 'SCHEMA_ANALYZED', message: 'Schema ecommerce-core.prisma analyzed. Found 6 entities.', metadata: { schemaId: 'schema_001', confidence: 0.96 } },
  { id: 'log_003', timestamp: minutesAgo(3), level: 'error', component: 'WorkflowRunner', event: 'EXECUTION_FAILED', message: 'Workflow send-notification failed: Rate limit exceeded (429)', workflowId: 'wf_005', workflowName: 'send-notification', metadata: { errorCode: 'RATE_LIMIT', provider: 'twilio' }, statusCode: 429 },
  { id: 'log_004', timestamp: minutesAgo(4), level: 'info', component: 'VoiceGateway', event: 'SESSION_STARTED', message: 'Voice session session_001 initiated', sessionId: 'session_001', metadata: { userId: 'user_external_001', channel: 'phone' } },
  { id: 'log_005', timestamp: minutesAgo(5), level: 'warning', component: 'SchemaAnalyzer', event: 'HIGH_LATENCY', message: 'Schema analysis took 1840ms (threshold: 1000ms)', metadata: { schemaId: 'schema_002', latencyMs: 1840 }, duration: 1840 },
  { id: 'log_006', timestamp: minutesAgo(8), level: 'success', component: 'N8nBridge', event: 'WORKFLOW_SYNCED', message: 'Tool create-order synced to n8n workflow n8n_wf_001', workflowId: 'wf_001', metadata: { n8nWorkflowId: 'n8n_wf_001', version: '1.2.0' } },
  { id: 'log_007', timestamp: minutesAgo(12), level: 'info', component: 'WorkflowRunner', event: 'EXECUTION_START', message: 'Executing workflow get-product-catalog', workflowId: 'wf_002', workflowName: 'get-product-catalog', metadata: { params: { page: 1, limit: 20 } }, statusCode: 200 },
  { id: 'log_008', timestamp: minutesAgo(15), level: 'debug', component: 'AIEngine', event: 'TOKEN_USAGE', message: 'Schema analysis used 4,218 tokens (claude-3-5-sonnet)', metadata: { promptTokens: 3100, completionTokens: 1118, model: 'claude-3-5-sonnet' } },
  { id: 'log_009', timestamp: minutesAgo(20), level: 'info', component: 'AuthGateway', event: 'TOKEN_VALIDATED', message: 'JWT validated for user admin@company.com', metadata: { userId: 'usr_admin', role: 'admin' } },
  { id: 'log_010', timestamp: minutesAgo(25), level: 'warning', component: 'WorkflowRunner', event: 'RETRY_ATTEMPT', message: 'Retry attempt 2/3 for workflow update-inventory', workflowId: 'wf_004', workflowName: 'update-inventory', metadata: { attempt: 2, maxAttempts: 3, delay: 1000 } },
];

// ===== ANALYTICS =====

function makeSeries(days: number, base: number, variance: number) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(new Date().getTime() - (days - 1 - i) * 86400000);
    return { date: date.toISOString().split('T')[0], value: Math.max(0, Math.round(base + (Math.random() - 0.5) * variance)) };
  });
}

export const mockAnalytics: AnalyticsDashboard = {
  period: { start: daysAgo(30), end: new Date().toISOString() },
  metrics: [
    { id: 'm1', name: 'Total Executions', value: 94821, previousValue: 78340, change: 16481, changePercent: 21.0, trend: 'up', unit: 'executions' },
    { id: 'm2', name: 'Success Rate', value: 98.3, previousValue: 97.1, change: 1.2, changePercent: 1.2, trend: 'up', unit: '%' },
    { id: 'm3', name: 'Avg Latency', value: 42, previousValue: 58, change: -16, changePercent: -27.6, trend: 'down', unit: 'ms' },
    { id: 'm4', name: 'Voice Sessions', value: 1432, previousValue: 1198, change: 234, changePercent: 19.5, trend: 'up', unit: 'sessions' },
    { id: 'm5', name: 'Active Tools', value: 19, previousValue: 14, change: 5, changePercent: 35.7, trend: 'up' },
    { id: 'm6', name: 'Error Rate', value: 1.7, previousValue: 2.9, change: -1.2, changePercent: -41.4, trend: 'down', unit: '%' },
  ],
  workflowUsage: makeSeries(30, 3200, 800),
  toolUsage: [
    { toolId: 'tool_001', toolName: 'create-order', callCount: 4821, successCount: 4778, failureCount: 43, avgLatencyMs: 42 },
    { toolId: 'tool_002', toolName: 'fetch-product-catalog', callCount: 12049, successCount: 12025, failureCount: 24, avgLatencyMs: 28 },
    { toolId: 'tool_003', toolName: 'get-customer-profile', callCount: 8341, successCount: 8308, failureCount: 33, avgLatencyMs: 34 },
    { toolId: 'tool_004', toolName: 'check-inventory', callCount: 6214, successCount: 6152, failureCount: 62, avgLatencyMs: 22 },
    { toolId: 'tool_006', toolName: 'send-notification', callCount: 2104, successCount: 1919, failureCount: 185, avgLatencyMs: 320 },
  ],
  successRate: makeSeries(30, 98, 3).map(d => ({ ...d, value: Math.min(100, Math.max(90, d.value)) })),
  endpointCalls: makeSeries(30, 5400, 1200),
  voiceSessions: makeSeries(30, 48, 22),
  topWorkflows: [
    { workflowId: 'wf_002', workflowName: 'get-product-catalog', executionCount: 54219, successCount: 54111, failureCount: 108, avgLatencyMs: 28, successRate: 99.8 },
    { workflowId: 'wf_006', workflowName: 'get-customer-profile', executionCount: 31204, successCount: 31081, failureCount: 123, avgLatencyMs: 34, successRate: 99.6 },
    { workflowId: 'wf_001', workflowName: 'create-order', executionCount: 18432, successCount: 18249, failureCount: 183, avgLatencyMs: 42, successRate: 99.1 },
    { workflowId: 'wf_004', workflowName: 'update-inventory', executionCount: 21847, successCount: 21279, failureCount: 568, avgLatencyMs: 55, successRate: 97.4 },
    { workflowId: 'wf_005', workflowName: 'send-notification', executionCount: 8921, successCount: 8135, failureCount: 786, avgLatencyMs: 320, successRate: 91.2 },
  ],
  errorRate: makeSeries(30, 1.7, 1),
};
