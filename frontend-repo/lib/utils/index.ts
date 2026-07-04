// === DATE UTILITIES ===

export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
) {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  });
}

export function formatDateTime(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(d);
}

// === NUMBER UTILITIES ===

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

export function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms}ms`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// === STRING UTILITIES ===

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function generateId(prefix = ''): string {
  const id = Math.random().toString(36).substring(2, 10);
  return prefix ? `${prefix}_${id}` : id;
}

// === STATUS UTILITIES ===

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'var(--color-success)',
    approved: 'var(--color-success)',
    healthy: 'var(--color-success)',
    success: 'var(--color-success)',
    inactive: 'var(--text-tertiary)',
    disabled: 'var(--text-tertiary)',
    idle: 'var(--text-tertiary)',
    pending: 'var(--color-warning)',
    pending_review: 'var(--color-warning)',
    degraded: 'var(--color-warning)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
    rejected: 'var(--color-error)',
    down: 'var(--color-error)',
    draft: 'var(--color-info)',
    info: 'var(--color-info)',
    listening: 'var(--accent-primary)',
    thinking: 'var(--color-warning)',
    speaking: 'var(--color-success)',
  };
  return map[status] ?? 'var(--text-tertiary)';
}

export function getStatusLabel(status: string): string {
  return status
    .split('_')
    .map(capitalize)
    .join(' ');
}

// === ARRAY UTILITIES ===

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    return {
      ...groups,
      [groupKey]: [...(groups[groupKey] || []), item],
    };
  }, {} as Record<string, T[]>);
}

export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

// === ASYNC UTILITIES ===

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// === CLIPBOARD ===

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// === COLOR UTILITIES ===

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// === VALIDATION ===

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// === WORKFLOW UTILITIES ===

export function getWorkflowEndpointUrl(endpoint: string, baseUrl = 'https://api.yourplatform.com'): string {
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

export function calculateSuccessRate(success: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((success / total) * 100 * 10) / 10;
}

// === LOCAL STORAGE ===

export function getFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function setToStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail
  }
}

// ─── String preprocessing ─────────────────────────────────────────────────────

export function stripComments(src: string, style: "sql" | "prisma"): string {
  src = src.replace(/\/\*[\s\S]*?\*\//g, " ");

  if (style === "sql") {
    src = src.replace(/--[^\n]*/g, "");
  } else {
    src = src.replace(/\/\/[^\n]*/g, "");
  }

  return src;
}

export function normaliseWhitespace(src: string): string {
  return src
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .trim();
}

// ─── Quoted-identifier helpers ────────────────────────────────────────────────

export function unquote(raw: string): string {
  return raw.replace(/^[`"[\]]+|[`"[\]]+$/g, "").trim();
}

export function consumeIdentifier(
  text: string
): { name: string; rest: string } | null {
  // Optional schema prefix we discard
  const pattern =
    /^(?:(?:[`"\[]?\w+[`"\]]?)\.)?([`"\[]?\w+[`"\]]?)\s*/;
  const m = text.match(pattern);
  if (!m) return null;
  return { name: unquote(m[1]), rest: text.slice(m[0].length) };
}

// ─── Parenthesis-aware extractors ─────────────────────────────────────────────

export function extractParenBody(
  src: string,
  startIndex = 0
): string | null {
  // Advance to first '('
  let i = startIndex;
  while (i < src.length && src[i] !== "(") i++;
  if (i >= src.length) return null;

  let depth = 0;
  const open = i;

  for (; i < src.length; i++) {
    if (src[i] === "(") {
      depth++;
    } else if (src[i] === ")") {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }

  return null; // unbalanced
}

export function extractBraceBody(
  src: string,
  startIndex = 0
): string | null {
  let i = startIndex;
  while (i < src.length && src[i] !== "{") i++;
  if (i >= src.length) return null;

  let depth = 0;
  const open = i;

  for (; i < src.length; i++) {
    if (src[i] === "{") {
      depth++;
    } else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }

  return null;
}

// ─── Paren-aware splitter ─────────────────────────────────────────────────────

export function splitParenAware(
  text: string,
  separator = ","
): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let current = "";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const prev = text[i - 1];

    if (ch === "'" && !inDouble && prev !== "\\") inSingle = !inSingle;
    else if (ch === '"' && !inSingle && prev !== "\\") inDouble = !inDouble;

    if (!inSingle && !inDouble) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
    }

    if (ch === separator && depth === 0 && !inSingle && !inDouble) {
      if (current.trim()) parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

// ─── Type normalisation ───────────────────────────────────────────────────────


export function normaliseSqlType(raw: string): string {
  const upper = raw.replace(/\s+/g, " ").toUpperCase().trim();

  const aliases: [RegExp, string][] = [
    [/^INT(?:EGER)?[24]?$/, "INTEGER"],
    [/^INT8$/, "BIGINT"],
    [/^INT2$/, "SMALLINT"],
    [/^TINYINT$/, "TINYINT"],
    [/^BOOL(?:EAN)?$/, "BOOLEAN"],
    [/^CHARACTER VARYING(?:\(\d+\))?$/, "VARCHAR"],
    [/^CHAR(?:ACTER)?$/, "CHAR"],
    [/^NATIONAL\s+(?:CHARACTER|CHAR)\s+VARYING/, "NVARCHAR"],
    [/^(?:LONG)?TEXT$|^MEDIUMTEXT$|^TINYTEXT$|^CLOB$/, "TEXT"],
    [/^DATETIME$/, "TIMESTAMP"],
    [/^UNIQUEIDENTIFIER$/, "UUID"],
    [/^JSONB$/, "JSONB"],
    [/^SERIAL$/, "INTEGER"],
    [/^BIGSERIAL$/, "BIGINT"],
    [/^SMALLSERIAL$/, "SMALLINT"],
    [/^FLOAT(?:4|8)?$/, "FLOAT"],
    [/^DOUBLE PRECISION$/, "DOUBLE PRECISION"],
    [/^REAL$/, "REAL"],
  ];

  for (const [re, canonical] of aliases) {
    const baseName = upper.split("(")[0].trim();
    if (re.test(baseName)) {
      const precision = upper.match(/\(\s*[\d,\s]+\s*\)/)?.[0] ?? "";
      const base = ["VARCHAR", "CHAR", "NVARCHAR", "DECIMAL", "NUMERIC"].includes(
        canonical
      )
        ? canonical + precision
        : canonical;
      return base;
    }
  }

  return upper;
}

export function normalisePrismaType(prismaType: string): string {
  const map: Record<string, string> = {
    String: "VARCHAR",
    Int: "INTEGER",
    BigInt: "BIGINT",
    Float: "FLOAT",
    Decimal: "DECIMAL",
    Boolean: "BOOLEAN",
    DateTime: "TIMESTAMP",
    Date: "DATE",
    Time: "TIME",
    Json: "JSON",
    Bytes: "BYTEA",
  };
  return map[prismaType] ?? prismaType.toUpperCase();
}

// ─── Deduplication ────────────────────────────────────────────────────────────

export function dedupeRelationships<
  T extends { from: string; to: string; fieldName: string }
>(rels: T[]): T[] {
  const seen = new Set<string>();
  return rels.filter((r) => {
    const key = `${r.from}.${r.fieldName}->${r.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
