'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { workflowService } from '@/lib/api/services';
import { useWorkflowStore, useUIStore } from '@/stores';
import { workflowEditSchema, type WorkflowEditFormData } from '@/lib/validators';
import { PageHeader, LoadingSkeleton, ErrorState } from '@/components/ui/UIComponents';
import { Button } from '@/components/ui/Button';
import { HTTP_METHOD_OPTIONS } from '@/lib/constants';
import styles from './edit.module.css';

export default function WorkflowEditPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.workflowId as string;
  const selectedWorkflow = useWorkflowStore(s => s.selectedWorkflow);
  const setSelectedWorkflow = useWorkflowStore(s => s.setSelectedWorkflow);
  const updateWorkflow = useWorkflowStore(s => s.updateWorkflow);
  const addToast = useUIStore(s => s.addToast);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<WorkflowEditFormData>({ resolver: zodResolver(workflowEditSchema) });

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const wf = await workflowService.getWorkflow(workflowId);
      if (!wf) { setError('Workflow not found'); setIsLoading(false); return; }
      setSelectedWorkflow(wf as any);
      reset({
        name: wf.name,
        description: wf.description ?? undefined,
        endpoint: wf.endpoint,
        httpMethod: wf.httpMethod,
        requiresAuth: wf.requiresAuth,
        tags: (wf as any).tags ?? [],
        changelog: '',
      });
      setIsLoading(false);
    }
    load();
  }, [workflowId, setSelectedWorkflow, reset]);

  const onSubmit = async (data: WorkflowEditFormData) => {
    const { tags, ...updateData } = data;
    updateWorkflow(workflowId, { ...updateData });
    addToast({ type: 'success', title: 'Workflow saved', message: `Version updated: ${data.changelog}` });
    router.push(`/workflows/${workflowId}`);
  };

  if (isLoading) return <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><LoadingSkeleton height={60} rounded /><LoadingSkeleton height={400} rounded /></div>;
  if (error) return <ErrorState title="Not found" message={error} onRetry={() => router.push('/workflows')} />;

  return (
    <div className={styles.page}>
      <div className={styles.backRow}>
        <button className={styles.backBtn} onClick={() => router.push(`/workflows/${workflowId}`)}>
          <ArrowLeft size={15} /> Back to workflow
        </button>
        {isDirty && (
          <div className={styles.unsavedBanner}>
            <AlertTriangle size={13} /> Unsaved changes
          </div>
        )}
      </div>

      <PageHeader title={`Edit: ${selectedWorkflow?.name ?? ''}`} description="Modify workflow metadata and configuration" />

      <div className={styles.grid}>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Basic Information</h3>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Workflow Name</label>
                <input className={`${styles.input} ${errors.name ? styles.inputError : ''}`} {...register('name')} placeholder="my-workflow-name" />
                {errors.name && <p className={styles.fieldError}>{errors.name.message}</p>}
              </div>
              <div className={`${styles.field} ${styles.fullWidth}`}>
                <label className={styles.label}>Description</label>
                <textarea className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`} rows={3} {...register('description')} placeholder="Describe what this workflow does..." />
                {errors.description && <p className={styles.fieldError}>{errors.description.message}</p>}
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Endpoint Configuration</h3>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label className={styles.label}>HTTP Method</label>
                <select className={styles.select} {...register('httpMethod')}>
                  {HTTP_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Endpoint Path</label>
                <input className={`${styles.input} ${errors.endpoint ? styles.inputError : ''}`} {...register('endpoint')} placeholder="/api/v1/resource" />
                {errors.endpoint && <p className={styles.fieldError}>{errors.endpoint.message}</p>}
              </div>
              <div className={styles.field}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" className={styles.checkbox} {...register('requiresAuth')} />
                  <span>Requires Authentication</span>
                </label>
                <p className={styles.hint}>JWT token will be validated on every request</p>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Version Notes</h3>
            <div className={styles.field}>
              <label className={styles.label}>Changelog <span className={styles.required}>*</span></label>
              <textarea className={`${styles.textarea} ${errors.changelog ? styles.inputError : ''}`} rows={2} {...register('changelog')} placeholder="What changed in this version?" />
              {errors.changelog && <p className={styles.fieldError}>{errors.changelog.message}</p>}
            </div>
          </div>

          <div className={styles.actions}>
            <Button variant="ghost" onClick={() => router.push(`/workflows/${workflowId}`)}>Cancel</Button>
            <Button type="submit" variant="primary" leftIcon={<Save size={14} />} isLoading={isSubmitting} disabled={!isDirty}>
              Save Changes
            </Button>
          </div>
        </form>

        {/* Version comparison panel */}
        <div className={styles.sidebar}>
          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Current Version</h3>
            <div className={styles.versionInfo}>
              <span className={styles.versionNum}>v{(selectedWorkflow as any)?.currentVersion}</span>
              <span className={styles.versionDate}>{(selectedWorkflow as any)?.updatedAt ? new Date((selectedWorkflow as any).updatedAt).toLocaleDateString() : '—'}</span>
            </div>
            <div className={styles.versionList}>
              {(selectedWorkflow as any)?.versions?.map((v: any) => (
                <div key={v.id} className={`${styles.versionItem} ${v.isActive ? styles.versionActive : ''}`}>
                  <span className={styles.versionTag}>v{v.version}</span>
                  <span className={styles.versionNote}>{v.changelog}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Edit Guidelines</h3>
            <ul className={styles.guideList}>
              <li>Changing the endpoint path creates a new version</li>
              <li>Auth requirements affect all active consumers</li>
              <li>Describe changes clearly in the changelog</li>
              <li>Deactivate before major structural changes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
