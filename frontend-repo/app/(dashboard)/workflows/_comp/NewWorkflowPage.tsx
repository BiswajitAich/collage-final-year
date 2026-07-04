'use client';

import { useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Zap,
  ArrowLeft,
  RefreshCw,
  Save,
  Check,
  BrainCircuit,
  Tag,
  CircleDot,
} from 'lucide-react';

import { useWorkflowStore, useSchemaStore, useUIStore } from '@/stores';
import {
  workflowGenerationSchema,
  type WorkflowGenerationFormData,
} from '@/lib/validators';
import { PageHeader } from '@/components/ui/UIComponents';
import { Button } from '@/components/ui/Button';
import { WorkflowGraph } from '@/components/workflow/WorkflowGraph';
import {
  ENDPOINT_TYPE_OPTIONS,
  HTTP_METHOD_OPTIONS,
  GENERATION_MODE_OPTIONS,
} from '@/lib/constants';
import styles from '../new/new-workflow.module.css';
import { ReviewAnalysis } from '../../schema/review/[id]/action';
import { WorkflowGraphData } from '../workflow.schema';
import { generateWorkFlow } from '../new/action';
import { addWorkflowToN8n } from '../action';


type Capability = ReviewAnalysis['capabilities'][number];

const CATEGORY_TO_METHOD: Record<
  string,
  WorkflowGenerationFormData['httpMethod']
> = {
  READ: 'GET',
  LIST: 'GET',
  CREATE: 'POST',
  UPDATE: 'PUT',
  DELETE: 'DELETE',
};

const CATEGORY_COLOR: Record<string, string> = {
  READ: 'var(--color-info)',
  LIST: 'var(--color-info)',
  CREATE: 'var(--color-success)',
  UPDATE: 'var(--color-warning)',
  DELETE: 'var(--color-error)',
};

interface Props {
  capability?: Capability | null;
  workflow?: WorkflowGraphData | null;
  workflowId?: string;
  schemaId?: string;
  capabilityId?: string;
}

// const mapToWorkflow = (wf: WorkflowGraphData, status: Workflow['status']): Workflow => {
//   return {
//     id: crypto.randomUUID(),

//     name: wf.id,
//     description: wf.description ?? null,
//     purpose: null,

//     status,

//     endpointType: wf.endpointType ?? 'REST',
//     httpMethod: wf.httpMethod ?? 'GET',
//     endpoint: '/generated', // or derive properly later

//     requiresAuth: true,
//     generationMode: 'AI',

//     workflowJson: wf,

//     executionCount: 0,
//     successRate: 0,
//     avgLatencyMs: 0,

//     approvedAt: null,
//     approvedById: null,

//     ownerId: 'temp-user', // replace with real auth

//     createdAt: new Date(),
//     updatedAt: new Date(),
//   };
// };
export default function NewWorkflowPage({
  capability = null,
  workflow,
  workflowId,
  schemaId,
  capabilityId,
}: Props) {
  const router = useRouter();
  const schemas = useSchemaStore(s => s.schemas);
  const addToast = useUIStore(s => s.addToast);

  const [generatedWorkflow, setGeneratedWorkflow] = useState<WorkflowGraphData | null>(workflow ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  const allEntities = Array.from(
    new Set([
      ...(capability?.entities ?? []),
      ...schemas.flatMap((s) => s.entities.map((e) => e.name)),
    ])
  );
  // console.log(JSON.stringify(workflow, null, 2));

  const derivedMethod =
    (capability?.suggestedMethod as WorkflowGenerationFormData['httpMethod']) ??
    CATEGORY_TO_METHOD[capability?.category ?? ''] ??
    'POST';

  const isReadCategory = capability?.category === 'READ';
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<WorkflowGenerationFormData>({
    resolver: zodResolver(workflowGenerationSchema),
    defaultValues: {
      name: capability?.suggestedEndpoint?.split('/').filter(Boolean).join('-') ?? '',
      purpose: capability?.description ?? '',
      entities: capability?.entities ?? [],
      httpMethod: derivedMethod,
      endpointType: 'REST',
      generationMode: 'AI',
      requiresAuth: true,
      isReadOnly: isReadCategory,
      enableCRUD: !isReadCategory,
      strictValidation: true,
      requiresApproval: true,
    },
  });

  const [savedWorkflowId, setSavedWorkflowId] = useState<string | null>(null);

  const onGenerate: SubmitHandler<WorkflowGenerationFormData> = async (data: WorkflowGenerationFormData) => {
    console.log('[UI CHECKPOINT] onGenerate started', { schemaId, capabilityId });
    if (!schemaId || !capabilityId) {
      addToast({
        type: 'error',
        title: 'Missing context',
        message: 'Schema ID or capability ID is missing.',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const wf = await generateWorkFlow({
        ...data,
        schemaId,
        capabilityId,
      });

      console.log('[UI CHECKPOINT] Workflow generated, DB id:', wf.id, 'graph id:', (wf as any).id);
      setSavedWorkflowId(wf.id);
      setGeneratedWorkflow(wf);

      addToast({
        type: 'success',
        title: 'Workflow generated!',
        message: `AI created "${wf.name}" with ${wf.graph.nodes.length} nodes.`,
      });
    } catch (error) {
      console.error('[UI ERROR] Generation failed:', error);
      addToast({
        type: 'error',
        title: 'Generation failed',
        message: 'Try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = () => {
    if (!generatedWorkflow) return;
    addToast({ type: 'success', title: 'Saved as draft' });
    router.push('/workflows');
  };

  const handleApprove = async () => {
    console.log('[UI CHECKPOINT] handleApprove called');
    console.log('[UI CHECKPOINT] workflowId prop:', workflowId);
    console.log('[UI CHECKPOINT] savedWorkflowId (DB id):', savedWorkflowId);
    console.log('[UI CHECKPOINT] generatedWorkflow?.id (graph id):', (generatedWorkflow as any)?.id);

    if (!generatedWorkflow) {
      console.log('[UI ERROR] No generated workflow to approve');
      return;
    }
    const idToUse = workflowId || savedWorkflowId;
    console.log('[UI CHECKPOINT] Using ID for n8n deploy:', idToUse);
    if (!idToUse) {
      addToast({ type: 'warning', title: 'Workflow id not found !' });
      return;
    }
    setIsDeploying(true);
    addToast({ type: 'info', title: 'Deploying to n8n…', message: 'Compiling and creating workflow.' });
    try {
      await addWorkflowToN8n(idToUse);
      addToast({ type: 'success', title: 'Deployed!', message: 'Workflow approved & saved to n8n.' });
    } catch (error) {
      console.error('[UI ERROR] Deploy failed:', error);
      addToast({ type: 'error', title: 'Deploy failed', message: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsDeploying(false);
    }
  };

  // const hasGraph = (generatedWorkflow?.graph?.nodes?.length ?? 0) > 0;
  return (
    <div className={styles.page}>
      <div className={styles.backRow}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <ArrowLeft size={15} /> Back
        </button>
      </div>

      <PageHeader
        title={capability ? `Generate: ${capability.name}` : 'Generate Workflow'}
        description={
          capability
            ? `AI-suggested ${capability.category.toLowerCase()} workflow · ${Math.round(
              capability.confidence * 100
            )}% confidence`
            : 'Describe your workflow and let AI generate the complete implementation'
        }
      />

      <div className={styles.grid} style={{ display: generatedWorkflow?.graph?.nodes?.length !== 0 ? "block" : "grid" }}>
        {generatedWorkflow?.graph?.nodes?.length !== 0 && (
          <div className={styles.formPanel}>
            <div className={styles.formHeader}>
              <BrainCircuit size={16} className={styles.formHeaderIcon} />
              <span>Workflow Request</span>

              {capability && (
                <span
                  className={styles.categoryBadge}
                  style={
                    {
                      '--cat-color':
                        CATEGORY_COLOR[capability.category] ?? 'var(--accent-primary)',
                    } as React.CSSProperties
                  }
                >
                  {capability.category}
                </span>
              )}
            </div>

            <form onSubmit={handleSubmit(onGenerate)} className={styles.form}>
              {/* Basic info */}
              <div className={styles.formSection}>
                <h4 className={styles.formSectionTitle}>Basic Information</h4>

                <div className={styles.field}>
                  <label className={styles.label}>Workflow Name *</label>
                  <input
                    className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                    {...register('name')}
                    placeholder="e.g. process-customer-order"
                  />
                  {errors.name && (
                    <span className={styles.error}>{errors.name.message}</span>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Purpose *</label>
                  <textarea
                    className={`${styles.textarea} ${errors.purpose ? styles.inputError : ''}`}
                    {...register('purpose')}
                    rows={3}
                    placeholder="Describe what this workflow should accomplish in detail..."
                  />
                  {errors.purpose && (
                    <span className={styles.error}>{errors.purpose.message}</span>
                  )}
                </div>

                {/* Suggested endpoint hint */}
                {capability?.suggestedEndpoint && (
                  <div className={styles.hintRow}>
                    <Tag size={12} />{' '}
                    <span>Suggested endpoint:</span>{' '}
                    <code className={styles.entityChipSelected}>
                      {capability.suggestedEndpoint}
                    </code>
                  </div>
                )}
              </div>

              {/* Entities */}
              <div className={styles.formSection}>
                <h4 className={styles.formSectionTitle}>Entities Involved *</h4>

                <Controller
                  name="entities"
                  control={control}
                  render={({ field }) => {
                    const [inputValue, setInputValue] = useState('');

                    const addEntity = (value: string) => {
                      const cleaned = value.trim();
                      if (!cleaned) return;

                      if (!field.value.includes(cleaned)) {
                        field.onChange([...field.value, cleaned]);
                      }
                    };

                    const removeEntity = (value: string) => {
                      field.onChange(field.value.filter((e: string) => e !== value));
                    };

                    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                      // SPACE → add entity
                      if (e.key === ' ') {
                        e.preventDefault();
                        addEntity(inputValue);
                        setInputValue('');
                      }

                      // BACKSPACE → remove last entity if input empty
                      if (e.key === 'Backspace' && inputValue === '') {
                        field.onChange(field.value.slice(0, -1));
                      }

                      // ENTER → also add (better UX)
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addEntity(inputValue);
                        setInputValue('');
                      }
                    };

                    return (
                      <div className={styles.field}>
                        {/* INPUT */}
                        <input
                          className={styles.input}
                          placeholder="User Order Product ..."
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                        />

                        {/* DEFAULT ENTITY SUGGESTIONS */}
                        <div className={styles.entityGrid}>
                          <>
                            {allEntities.map((entity) => {
                              const isSelected = field.value.includes(entity);
                              if (isSelected) return null;
                              return (
                                <button
                                  key={entity}
                                  type="button"
                                  className={[
                                    styles.entityChip,
                                    isSelected ? styles.entityChipSelected : '',
                                  ].join(' ')}
                                  onClick={() =>
                                    isSelected
                                      ? removeEntity(entity)
                                      : field.onChange([...field.value, entity])
                                  }
                                >
                                  {entity}
                                </button>
                              );
                            })}
                            {field.value.map((entity: string) => (
                              <button key={entity}
                                className={`${styles.entityChip} ${styles.entityChipSelected}`}
                                type="button"
                                onClick={() => removeEntity(entity)}
                              >
                                {entity}
                              </button>
                            ))}
                          </>
                        </div>
                      </div>
                    );
                  }}
                />

                {errors.entities && (
                  <span className={styles.error}>{errors.entities.message}</span>
                )}
              </div>

              {/* Endpoint configuration */}
              <div className={styles.formSection}>
                <h4 className={styles.formSectionTitle}>Endpoint Configuration</h4>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Endpoint Type</label>
                    <select className={styles.select} {...register('endpointType')}>
                      {ENDPOINT_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>HTTP Method</label>
                    <select className={styles.select} {...register('httpMethod')}>
                      {HTTP_METHOD_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Generation Mode</label>

                  <div className={styles.modeCards}>
                    {GENERATION_MODE_OPTIONS.map((mode) => (
                      <label key={mode.value} className={styles.modeCard}>
                        <input
                          type="radio"
                          value={mode.value}
                          {...register('generationMode')}
                          className={styles.modeRadio}
                        />
                        <span className={styles.modeLabel}>{mode.label}</span>
                        <span className={styles.modeDesc}>{mode.description}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className={styles.formSection}>
                <h4 className={styles.formSectionTitle}>Options</h4>

                <div className={styles.optionsGrid}>
                  {(
                    [
                      { name: 'requiresAuth', label: 'Auth Required', desc: 'JWT authentication' },
                      { name: 'isReadOnly', label: 'Read Only', desc: 'GET operations only' },
                      { name: 'enableCRUD', label: 'Full CRUD', desc: 'All HTTP methods' },
                      { name: 'strictValidation', label: 'Strict Validation', desc: 'Reject invalid payloads' },
                      { name: 'requiresApproval', label: 'Needs Approval', desc: 'Manual review required' },
                    ] as const
                  ).map((opt) => (
                    <label key={opt.name} className={styles.optionItem}>
                      <input
                        type="checkbox"
                        {...register(opt.name)}
                        className={styles.checkbox}
                      />
                      <div>
                        <span className={styles.optionLabel}>{opt.label}</span>
                        <span className={styles.optionDesc}>{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                leftIcon={<Zap size={15} />}
                isLoading={isGenerating}
                size="lg"
              >
                {isGenerating ? 'Generating with AI…' : 'Generate Workflow'}
              </Button>
            </form>
          </div>
        )}

        <div className={styles.previewPanel}>
          {isGenerating ? (
            <div className={styles.generatingState}>
              <div className={styles.generatingAnimation}>
                <BrainCircuit size={32} className={styles.generatingIcon} />
              </div>
              <h3 className={styles.generatingTitle}>
                AI is generating your workflow…
              </h3>
              <p className={styles.generatingDesc}>
                Analyzing entities, inferring business logic, building node graph…
              </p>
              <div className={styles.generatingSteps}>
                {[
                  'Parsing entities',
                  'Inferring relationships',
                  'Building node graph',
                  'Generating validations',
                  'Finalizing n8n config',
                ].map((step, i) => (
                  <div key={step} className={styles.generatingStep}>
                    <div
                      className={styles.stepDot}
                      style={{ animationDelay: `${i * 0.3}s` }}
                    />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : generatedWorkflow ? (
            <div className={styles.generatedContent}>
              <div className={styles.generatedHeader}>
                <div className={styles.generatedTitleRow}>
                  <h3 className={styles.generatedTitle}>{generatedWorkflow.id}</h3>
                  {/* <StatusBadge status={generatedWorkflow?.status} /> */}
                </div>
                <p className={styles.generatedDesc}>
                  {generatedWorkflow.description}
                </p>
                <div className={styles.generatedMeta}>
                  <span className={styles.metaChip}>{generatedWorkflow.httpMethod}</span>
                  <span className={styles.metaChip}>{generatedWorkflow.endpointType}</span>
                  <span className={styles.metaChip}>
                    {generatedWorkflow?.graph?.nodes.length} nodes
                  </span>
                  <span className={styles.metaChip}>
                    {generatedWorkflow?.graph?.edges.length} connections
                  </span>
                </div>
              </div>

              <div className={styles.graphWrap}>
                <WorkflowGraph
                  nodes={generatedWorkflow?.graph?.nodes}
                  edges={generatedWorkflow?.graph?.edges}
                  readonly
                />
              </div>

              <div className={styles.generatedActions}>
                <Button
                  variant="secondary"
                  leftIcon={<RefreshCw size={14} />}
                  onClick={handleSubmit(onGenerate)}
                  isLoading={isGenerating}
                >
                  Regenerate
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={<Save size={14} />}
                  onClick={handleSaveDraft}
                >
                  Save Draft
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Check size={14} />}
                  onClick={handleApprove}
                  isLoading={isDeploying}
                >
                  {isDeploying ? 'Deploying…' : 'Approve &amp; Test on n8n'}
                </Button>
              </div>
            </div>
          ) : capability ? (
            <div className={styles.capabilityPreview}>
              <div className={styles.capabilityBadgeRow}>
                <span
                  className={styles.capabilityCategory}
                  style={
                    {
                      '--cat-color':
                        CATEGORY_COLOR[capability.category] ?? 'var(--accent-primary)',
                    } as CSSProperties
                  }
                >
                  <CircleDot size={12} />
                  {capability.category}
                </span>
                <span className={styles.capabilityConfidence}>
                  {Math.round(capability.confidence * 100)}% confidence
                </span>
              </div>

              <h3 className={styles.capabilityName}>{capability.name}</h3>
              <p className={styles.capabilityDesc}>{capability.description}</p>

              <div className={styles.capabilityMeta}>
                <div className={styles.capabilityMetaItem}>
                  <span className={styles.capabilityMetaKey}>Method</span>
                  <code className={styles.capabilityMetaVal}>{derivedMethod}</code>
                </div>
                <div className={styles.capabilityMetaItem}>
                  <span className={styles.capabilityMetaKey}>Endpoint</span>
                  <code className={styles.capabilityMetaVal}>
                    {capability.suggestedEndpoint}
                  </code>
                </div>
                <div className={styles.capabilityMetaItem}>
                  <span className={styles.capabilityMetaKey}>Entities</span>
                  <div className={styles.capabilityEntities}>
                    {capability.entities.map((e) => (
                      <span key={e} className={styles.entityPill}>
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.capabilityPrompt}>
                <Zap size={13} />
                {' '}Form is pre-filled — hit <strong>Generate Workflow</strong> to build the graph.
              </div>
            </div>
          ) : (
            <div className={styles.previewEmpty}>
              <div className={styles.previewEmptyIcon}>
                <Zap size={32} />
              </div>

              <h3 className={styles.previewEmptyTitle}>Ready to generate</h3>

              <p className={styles.previewEmptyDesc}>
                Fill in the form on the left and click
                <strong> Generate Workflow</strong>
                to let AI build your workflow graph.
              </p>

              <div className={styles.previewFeatures}>
                {[
                  'Auto-generated node graph',
                  'Business logic inference',
                  'Validation rules',
                  'n8n-ready export',
                  'Tool mappings',
                ].map((f) => (
                  <div key={f} className={styles.previewFeature}>
                    <Check size={12} className={styles.featureCheck} />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div >
  );
}