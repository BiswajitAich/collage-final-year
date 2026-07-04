'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Settings2, BrainCircuit, Workflow, Mic, Server,
  Shield, Palette, Save, CheckCircle2
} from 'lucide-react';
import { useSettingsStore, useUIStore } from '@/stores';
import { PageHeader } from '@/components/ui/UIComponents';
import { Button } from '@/components/ui/Button';
import {
  settingsGeneralSchema, settingsAISchema, settingsN8nSchema,
  type SettingsGeneralFormData, type SettingsAIFormData, type SettingsN8nFormData
} from '@/lib/validators';
import {
  TIMEZONE_OPTIONS, AI_MODEL_OPTIONS, VOICE_PROVIDER_OPTIONS, DATE_FORMAT_OPTIONS
} from '@/lib/constants';
import styles from './settings.module.css';

type SettingsTab = 'general' | 'ai' | 'workflow' | 'voice' | 'n8n' | 'security' | 'theme';

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'general',  label: 'General',       icon: Settings2   },
  { id: 'ai',       label: 'AI Engine',      icon: BrainCircuit },
  { id: 'workflow', label: 'Workflows',      icon: Workflow    },
  { id: 'voice',    label: 'Voice Assistant',icon: Mic         },
  { id: 'n8n',      label: 'n8n Config',     icon: Server      },
  { id: 'security', label: 'Security',       icon: Shield      },
  { id: 'theme',    label: 'Theme',          icon: Palette     },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const settings = useSettingsStore(s => s.settings);
  const updateSettings = useSettingsStore(s => s.updateSettings);
  const saveSettings = useSettingsStore(s => s.saveSettings);
  const isDirty = useSettingsStore(s => s.isDirty);
  const isSaving = useSettingsStore(s => s.isSaving);
  const addToast = useUIStore(s => s.addToast);

  const handleSave = async () => {
    await saveSettings();
    addToast({ type: 'success', title: 'Settings saved', message: 'Your configuration has been updated.' });
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Settings"
        description="Configure your AI Workflow Platform"
        actions={
          isDirty && (
            <Button variant="primary" size="sm" leftIcon={<Save size={14} />} isLoading={isSaving} onClick={handleSave}>
              Save Changes
            </Button>
          )
        }
      />

      <div className={styles.layout}>
        {/* Sidebar Navigation */}
        <nav className={styles.settingsNav}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`${styles.navItem} ${activeTab === tab.id ? styles.navItemActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Settings Panel */}
        <div className={styles.settingsContent}>
          {activeTab === 'general'  && <GeneralSettings settings={settings.general} onChange={(v) => updateSettings('general', v)} />}
          {activeTab === 'ai'       && <AISettings settings={settings.ai} onChange={(v) => updateSettings('ai', v)} />}
          {activeTab === 'workflow' && <WorkflowSettings settings={settings.workflow} onChange={(v) => updateSettings('workflow', v)} />}
          {activeTab === 'voice'    && <VoiceSettings settings={settings.voice} onChange={(v) => updateSettings('voice', v)} />}
          {activeTab === 'n8n'      && <N8nSettings settings={settings.n8n} onChange={(v) => updateSettings('n8n', v)} />}
          {activeTab === 'security' && <SecuritySettings settings={settings.security} onChange={(v) => updateSettings('security', v)} />}
          {activeTab === 'theme'    && <ThemeSettings />}
        </div>
      </div>
    </div>
  );
}

/* ===== SECTION COMPONENTS ===== */

function SettingsSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {description && <p className={styles.sectionDesc}>{description}</p>}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
      {hint && <p className={styles.fieldHint}>{hint}</p>}
      {error && <p className={styles.fieldError}>{error}</p>}
    </div>
  );
}

/* === GENERAL === */
function GeneralSettings({ settings, onChange }: { settings: any; onChange: (v: any) => void }) {
  return (
    <SettingsSection title="General" description="Platform identity and localization settings">
      <div className={styles.fieldGrid}>
        <Field label="Platform Name" hint="Displayed in the sidebar and page titles">
          <input className={styles.input} value={settings.platformName} onChange={(e) => onChange({ platformName: e.target.value })} />
        </Field>
        <Field label="Admin Email" hint="Receives system notifications and alerts">
          <input className={styles.input} type="email" value={settings.adminEmail} onChange={(e) => onChange({ adminEmail: e.target.value })} />
        </Field>
        <Field label="Timezone">
          <select className={styles.select} value={settings.timezone} onChange={(e) => onChange({ timezone: e.target.value })}>
            {TIMEZONE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Date Format">
          <select className={styles.select} value={settings.dateFormat} onChange={(e) => onChange({ dateFormat: e.target.value })}>
            {DATE_FORMAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </div>
    </SettingsSection>
  );
}

/* === AI === */
function AISettings({ settings, onChange }: { settings: any; onChange: (v: any) => void }) {
  return (
    <SettingsSection title="AI Engine" description="Configure the AI model used for schema analysis and workflow generation">
      <div className={styles.fieldGrid}>
        <Field label="Model" hint="Model used for schema analysis and workflow generation">
          <select className={styles.select} value={settings.model} onChange={(e) => onChange({ model: e.target.value })}>
            {AI_MODEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label={`Temperature: ${settings.temperature}`} hint="Higher = more creative, Lower = more deterministic">
          <input type="range" min="0" max="2" step="0.1" value={settings.temperature} onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })} className={styles.slider} />
        </Field>
        <Field label="Max Tokens" hint="Maximum response length for AI generation">
          <input className={styles.input} type="number" value={settings.maxTokens} onChange={(e) => onChange({ maxTokens: parseInt(e.target.value) })} min={100} max={100000} />
        </Field>
        <Field label={`Confidence Threshold: ${Math.round(settings.confidenceThreshold * 100)}%`} hint="Minimum confidence score to auto-accept AI analysis">
          <input type="range" min="0.5" max="1" step="0.01" value={settings.confidenceThreshold} onChange={(e) => onChange({ confidenceThreshold: parseFloat(e.target.value) })} className={styles.slider} />
        </Field>
      </div>
      <div className={styles.toggleRow}>
        <Toggle label="Auto-Generate Workflows" description="Automatically trigger workflow generation after schema approval" checked={settings.autoGenerate} onChange={(v) => onChange({ autoGenerate: v })} />
        <Toggle label="Require Approval" description="AI-generated workflows require manual review before activation" checked={settings.requireApproval} onChange={(v) => onChange({ requireApproval: v })} />
      </div>
    </SettingsSection>
  );
}

/* === WORKFLOW === */
function WorkflowSettings({ settings, onChange }: { settings: any; onChange: (v: any) => void }) {
  return (
    <SettingsSection title="Workflow Settings" description="Default behavior for workflow generation and execution">
      <div className={styles.fieldGrid}>
        <Field label="Execution Timeout (seconds)">
          <input className={styles.input} type="number" value={settings.executionTimeout} onChange={(e) => onChange({ executionTimeout: parseInt(e.target.value) })} min={1} max={300} />
        </Field>
        <Field label="Retry Attempts" hint="How many times to retry failed workflow executions">
          <input className={styles.input} type="number" value={settings.retryAttempts} onChange={(e) => onChange({ retryAttempts: parseInt(e.target.value) })} min={0} max={10} />
        </Field>
        <Field label="Max Versions Kept" hint="Number of historical versions to retain per workflow">
          <input className={styles.input} type="number" value={settings.maxVersionsKept} onChange={(e) => onChange({ maxVersionsKept: parseInt(e.target.value) })} min={1} max={100} />
        </Field>
        <Field label="Default Endpoint Type">
          <select className={styles.select} value={settings.defaultEndpointType} onChange={(e) => onChange({ defaultEndpointType: e.target.value })}>
            {['REST', 'GraphQL', 'WebSocket', 'Webhook'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <div className={styles.toggleRow}>
        <Toggle label="Auto Versioning" description="Automatically create a new version on every save" checked={settings.autoVersioning} onChange={(v) => onChange({ autoVersioning: v })} />
        <Toggle label="Auth Required by Default" description="New workflows require authentication unless explicitly set to public" checked={settings.defaultAuthRequired} onChange={(v) => onChange({ defaultAuthRequired: v })} />
      </div>
    </SettingsSection>
  );
}

/* === VOICE === */
function VoiceSettings({ settings, onChange }: { settings: any; onChange: (v: any) => void }) {
  return (
    <SettingsSection title="Voice Assistant" description="Configure the text-to-speech and speech recognition providers">
      <div className={styles.fieldGrid}>
        <Field label="Provider">
          <select className={styles.select} value={settings.provider} onChange={(e) => onChange({ provider: e.target.value })}>
            {VOICE_PROVIDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Voice" hint="TTS voice to use for assistant responses">
          <input className={styles.input} value={settings.voice} onChange={(e) => onChange({ voice: e.target.value })} placeholder="e.g. Rachel, Alloy, en-US-Neural2-A" />
        </Field>
        <Field label="Language">
          <input className={styles.input} value={settings.language} onChange={(e) => onChange({ language: e.target.value })} placeholder="e.g. en-US" />
        </Field>
        <Field label="Max Session Duration (seconds)">
          <input className={styles.input} type="number" value={settings.maxSessionDuration} onChange={(e) => onChange({ maxSessionDuration: parseInt(e.target.value) })} min={60} max={7200} />
        </Field>
        <Field label="Silence Timeout (seconds)" hint="Seconds of silence before ending session">
          <input className={styles.input} type="number" value={settings.silenceTimeout} onChange={(e) => onChange({ silenceTimeout: parseInt(e.target.value) })} min={1} max={60} />
        </Field>
      </div>
      <div className={styles.toggleRow}>
        <Toggle label="Enable Transcription" description="Store voice session transcripts for review" checked={settings.enableTranscription} onChange={(v) => onChange({ enableTranscription: v })} />
      </div>
    </SettingsSection>
  );
}

/* === N8N === */
function N8nSettings({ settings, onChange }: { settings: any; onChange: (v: any) => void }) {
  return (
    <SettingsSection title="n8n Configuration" description="Connect to your n8n workflow automation instance">
      <div className={styles.connectionBanner}>
        <CheckCircle2 size={15} className={styles.connectionIcon} />
        <span>Connected to n8n at {settings.baseUrl || 'https://n8n.company.com'}</span>
      </div>
      <div className={styles.fieldGrid}>
        <Field label="n8n Base URL" hint="The URL of your n8n instance">
          <input className={styles.input} value={settings.baseUrl} onChange={(e) => onChange({ baseUrl: e.target.value })} placeholder="https://n8n.company.com" />
        </Field>
        <Field label="API Key" hint="n8n API key for authentication">
          <input className={styles.input} type="password" value={settings.apiKey} onChange={(e) => onChange({ apiKey: e.target.value })} placeholder="••••••••••••••••" />
        </Field>
        <Field label="Webhook Base URL" hint="Base URL for n8n webhook endpoints">
          <input className={styles.input} value={settings.webhookBaseUrl} onChange={(e) => onChange({ webhookBaseUrl: e.target.value })} placeholder="https://n8n.company.com/webhook" />
        </Field>
        <Field label={`Sync Interval: ${settings.syncInterval}s`} hint="How often to sync tool definitions with n8n">
          <input type="range" min="60" max="3600" step="60" value={settings.syncInterval} onChange={(e) => onChange({ syncInterval: parseInt(e.target.value) })} className={styles.slider} />
        </Field>
      </div>
      <div className={styles.toggleRow}>
        <Toggle label="Auto Sync" description="Automatically sync workflows with n8n on changes" checked={settings.autoSync} onChange={(v) => onChange({ autoSync: v })} />
      </div>
    </SettingsSection>
  );
}

/* === SECURITY === */
function SecuritySettings({ settings, onChange }: { settings: any; onChange: (v: any) => void }) {
  return (
    <SettingsSection title="Security" description="Authentication, session, and access control settings">
      <div className={styles.fieldGrid}>
        <Field label="Session Timeout (seconds)" hint="Users are logged out after this period of inactivity">
          <input className={styles.input} type="number" value={settings.sessionTimeout} onChange={(e) => onChange({ sessionTimeout: parseInt(e.target.value) })} min={300} />
        </Field>
        <Field label="JWT Expiry (seconds)">
          <input className={styles.input} type="number" value={settings.jwtExpiry} onChange={(e) => onChange({ jwtExpiry: parseInt(e.target.value) })} min={3600} />
        </Field>
      </div>
      <div className={styles.toggleRow}>
        <Toggle label="Enable MFA" description="Require multi-factor authentication for all admin accounts" checked={settings.enableMFA} onChange={(v) => onChange({ enableMFA: v })} />
        <Toggle label="Enable Audit Log" description="Log all admin actions and configuration changes" checked={settings.enableAuditLog} onChange={(v) => onChange({ enableAuditLog: v })} />
      </div>
    </SettingsSection>
  );
}

/* === THEME === */
function ThemeSettings() {
  const accents = ['#00c8f8', '#7c6af7', '#10d48a', '#f5a623', '#f0455a', '#e879f9'];
  return (
    <SettingsSection title="Theme" description="Customize the platform appearance">
      <div className={styles.themeSection}>
        <p className={styles.themeLabel}>Accent Color</p>
        <div className={styles.colorPalette}>
          {accents.map((color) => (
            <button key={color} className={styles.colorSwatch} style={{ background: color }} title={color} onClick={() => document.documentElement.style.setProperty('--accent-primary', color)} />
          ))}
        </div>
      </div>
      <div className={styles.themeSection}>
        <p className={styles.themeLabel}>Theme Mode</p>
        <div className={styles.themeModes}>
          {['Dark (default)', 'Darker', 'Midnight'].map((mode) => (
            <button key={mode} className={`${styles.themeMode} ${mode === 'Dark (default)' ? styles.themeModeActive : ''}`}>
              {mode}
            </button>
          ))}
        </div>
      </div>
    </SettingsSection>
  );
}

/* === TOGGLE COMPONENT === */
function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={styles.toggleItem}>
      <div className={styles.toggleInfo}>
        <span className={styles.toggleLabel}>{label}</span>
        <span className={styles.toggleDesc}>{description}</span>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  );
}
