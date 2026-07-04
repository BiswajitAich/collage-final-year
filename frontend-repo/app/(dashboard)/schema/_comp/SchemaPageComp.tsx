'use client';

import { useRef, useState } from 'react';
import { Upload, FileCode2, Eye, RefreshCw, Database, Code2 } from 'lucide-react';
// import { schemaService } from '@/lib/api/services';
import { useSchemaStore, useUIStore } from '@/stores';
import { PageHeader, StatusBadge, EmptyState, LoadingSkeleton } from '@/components/ui/UIComponents';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { timeAgo } from '@/lib/utils';
import type { UploadedSchema, SchemaEntity, TableColumn } from '@/lib/types';
import styles from '../schema.module.css';
import { getSchemas, revalidateGetSchemas, uploadSchemaAction } from '../action';
import dynamic from 'next/dynamic';
import { atelierForestDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
const SyntaxHighlighter = dynamic(() => import('react-syntax-highlighter').then(m => m.default), { ssr: false });
import { mapParsedSchema } from '@/lib/mapper';

export default function SchemaPageComp({ schemasData }: { schemasData: UploadedSchema[] }) {
    const isLoading = useSchemaStore(s => s.isLoading);
    const isUploading = useSchemaStore(s => s.isUploading);
    const setLoading = useSchemaStore(s => s.setLoading);
    const setUploading = useSchemaStore(s => s.setUploading);
    const addToast = useUIStore(s => s.addToast);
    const [dragOver, setDragOver] = useState(false);
    const [pasteMode, setPasteMode] = useState(false);
    const [displayRawSchema, setDisplayRawSchema] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [schemas, setSchemas] = useState<UploadedSchema[]>(schemasData ?? []);
    const [schemaFormat, setSchemaFormat] = useState<'PRISMA' | 'SQL'>('PRISMA');
    const [selectedSchema, setSelectedSchema] = useState<UploadedSchema | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    //   fix needed ---- handlePasteUpload fixed!
    const handleFileUpload = async (file: File) => {
        try {
            setUploading(true);

            const ext = file.name.split(".").pop()?.toLowerCase();

            if (ext !== "prisma" && ext !== "sql") {
                throw new Error("Unsupported format");
            }

            const format = ext.toUpperCase() as "PRISMA" | "SQL";

            const content = await file.text();

            const result = await uploadSchemaAction(
                file.name,
                format,
                content
            );

            if (!result.success) {
                addToast({ type: 'error', title: 'Upload failed', message: result.error ?? 'Failed to save schema' });
                return;
            }

            const uploaded = mapParsedSchema(
                file.name,
                format,
                content,
                result
            );

            setSchemas((prev) => [uploaded, ...prev]);
            setSelectedSchema(uploaded);

            addToast({
                type: "success",
                title: "Schema uploaded",
                message: `${uploaded.entityCount} entities detected`,
            });

            await revalidateGetSchemas();
        } catch {
            addToast({
                type: "error",
                title: "Upload failed",
                message: "Failed to process schema file.",
            });
        } finally {
            setUploading(false);
        }
    };

    const handlePasteUpload = async () => {
        if (!pasteText.trim()) return;

        try {
            setUploading(true);

            const result = await uploadSchemaAction(
                `manual-schema.${schemaFormat.toLowerCase()}`,
                schemaFormat,
                pasteText
            );

            if (!result.success) {
                addToast({ type: 'error', title: 'Error!', message: result.error })
                return;
            }

            const uploaded = mapParsedSchema(
                `manual-schema.${schemaFormat.toLowerCase()}`,
                schemaFormat,
                pasteText,
                result
            );

            setSchemas((prev) => [uploaded, ...prev]);

            setSelectedSchema(uploaded);

            setPasteText("");
            setPasteMode(false);

            addToast({ type: "success", title: "Schema analyzed", message: `${uploaded.entityCount} entities detected` });

            await revalidateGetSchemas();
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    const entityColumns: TableColumn<SchemaEntity>[] = [
        {
            key: 'name', label: 'Entity', sortable: true,
            render: (_, row) => (
                <div className={styles.entityCell}>
                    <Database size={13} className={styles.entityIcon} />
                    <span className={styles.entityName}>{row.name}</span>
                    {row.isJunction && <span className={styles.junctionTag}>junction</span>}
                </div>
            ),
        },
        { key: 'tableName', label: 'Table', sortable: true, render: (v) => <code className={styles.mono}>{String(v)}</code> },
        { key: 'fieldCount', label: 'Fields', sortable: true, width: '80px', render: (v) => <span className={styles.mono}>{String(v)}</span> },
        // {
        //   key: 'description', label: 'Description',
        //   render: (v) => <span className={styles.dimText}>{v ? String(v) : '—'}</span>,
        // },
    ];

    const refreshSchemas = async () => {
        try {
            setLoading(true);

            await revalidateGetSchemas();

            const data = await getSchemas();

            setSchemas(data);

            if (data.length > 0) {
                setSelectedSchema(data[0]);
            }
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className={styles.page}>
            <PageHeader
                title="Schema Manager"
                description="Upload and analyze your database schemas to generate AI workflows"
                actions={
                    <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<RefreshCw size={14} />}
                        onClick={refreshSchemas}
                    >
                        Refresh
                    </Button>
                }
            />

            <div className={styles.grid}>
                {/* Upload Panel */}
                <div className={styles.uploadPanel}>
                    <h3 className={styles.panelTitle}>Upload Schema</h3>

                    {/* Format Selector */}
                    <div className={styles.formatRow}>
                        {(['PRISMA', 'SQL'] as const).map((f) => (
                            <button key={f} className={`${styles.formatBtn} ${schemaFormat === f ? styles.formatBtnActive : ''}`} onClick={() => setSchemaFormat(f)}>
                                .{f}
                            </button>
                        ))}
                    </div>

                    {/* Drop Zone */}
                    {!pasteMode && (
                        <div
                            className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            role="button"
                            tabIndex={0}
                            aria-label="Upload schema file"
                        >
                            <input ref={fileInputRef} type="file" accept=".prisma,.sql,.json,.graphql" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                            {isUploading ? (
                                <div className={styles.uploadingState}>
                                    <div className={styles.uploadSpinner} />
                                    <span>Analyzing schema...</span>
                                </div>
                            ) : (
                                <>
                                    <Upload size={28} className={styles.dropIcon} />
                                    <span className={styles.dropTitle}>Drop schema file here</span>
                                    <span className={styles.dropSubtitle}>or click to browse · .prisma .sql .json .graphql</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Paste Mode */}
                    <button className={styles.pasteToggle} onClick={() => setPasteMode((v) => !v)}>
                        {pasteMode ? 'Cancel paste mode' : 'Paste schema text instead'}
                    </button>

                    {pasteMode && (
                        <div className={styles.pasteArea}>
                            <textarea
                                className={styles.pasteInput}
                                value={pasteText}
                                onChange={(e) => setPasteText(e.target.value)}
                                rows={12}
                                placeholder={`Paste your ${schemaFormat} schema here...`}
                            />
                            <Button variant="primary" fullWidth isLoading={isUploading} onClick={handlePasteUpload} disabled={!pasteText.trim()}>
                                Analyze Schema
                            </Button>
                        </div>
                    )}

                    {/* Schema History */}
                    <div className={styles.historySection}>
                        <h4 className={styles.historyTitle}>Schema History</h4>
                        {isLoading ? (
                            <LoadingSkeleton height={52} count={3} />
                        ) : schemas.length === 0 ? (
                            <EmptyState title="No schemas" description="Upload your first schema above." />
                        ) : (
                            <div className={styles.historyList}>
                                {schemas.map((s) => (
                                    <div key={s.id} className={`${styles.historyItem} ${selectedSchema?.id === s.id ? styles.historyItemActive : ''}`} onClick={() => setSelectedSchema(s)}>
                                        <FileCode2 size={14} className={styles.historyIcon} />
                                        <div className={styles.historyInfo}>
                                            <span className={styles.historyName}>{s.name}</span>
                                            <span className={styles.historyMeta}>{s.entityCount} entities · {timeAgo(s.uploadedAt)}</span>
                                        </div>
                                        <StatusBadge status={s.status} size="sm" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview Panel */}
                <div className={styles.previewPanel}>
                    {!selectedSchema ? (
                        <div className={styles.previewEmpty}>
                            <Database size={36} />
                            <p>Select or upload a schema to preview entities</p>
                        </div>
                    ) : (
                        <>
                            <div className={styles.previewHeader}>
                                <div className={styles.previewTitleRow}>
                                    <h3 className={styles.previewTitle}>{selectedSchema.name}</h3>
                                    <StatusBadge status={selectedSchema.status} />
                                </div>
                                <div className={styles.previewMeta}>
                                    <span>{selectedSchema.entityCount} entities</span>
                                    <span>·</span>
                                    <span>{selectedSchema.relationshipCount} relationships</span>
                                    <span>·</span>
                                    <span className={styles.formatTag}>.{selectedSchema.format}</span>
                                    <span>·</span>
                                    <span>{timeAgo(selectedSchema.uploadedAt)}</span>
                                </div>
                            </div>

                            <DataTable
                                columns={entityColumns}
                                data={selectedSchema.entities ?? []}
                                keyExtractor={(row) => String(row.id)}
                                emptyTitle="No entities found"
                            />

                            <div className={styles.rawSchemaWrap}>
                                <div className={styles.rawSchemaHeader}>
                                    <span className={styles.rawSchemaTitle}>Raw Schema</span>
                                    <Button variant="ghost" size="sm" leftIcon={<Eye size={12} />} onClick={() => {
                                        setDisplayRawSchema(!displayRawSchema);
                                    }}>{!displayRawSchema ? "View full" : "View less"}</Button>
                                </div>
                                <SyntaxHighlighter
                                    language={selectedSchema.format.toLowerCase()}
                                    style={atelierForestDark}
                                >
                                    {displayRawSchema
                                        ? selectedSchema.rawContent
                                        : `${selectedSchema.rawContent.slice(0, 800)}...`}
                                </SyntaxHighlighter>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

