"use client";
import { Button } from "@/components/ui/Button";
import { EmptyState, LoadingSkeleton, PageHeader, StatusBadge } from "@/components/ui/UIComponents";
import { Bot, ChevronRight, Database, Eye, FileCode2, RefreshCw } from "lucide-react";
import { getSchemas, revalidateGetSchemas } from "../action";
import styles from "../schema.module.css";
import { useEffect, useState } from "react";
import { useSchemaStore } from "@/stores";
import { timeAgo } from "@/lib/utils";
import { DataTable } from "@/components/ui/DataTable";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atelierForestDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { TableColumn, SchemaEntity } from "@/lib/types";
import Link from "next/link";

const SchemaReviewPage = () => {
  const {
    isLoading, setLoading,
    schemas, setSchemas,
    selectedSchema, setSelectedSchema,
  } = useSchemaStore();
  const [displayRawSchema, setDisplayRawSchema] = useState(false)

  useEffect(() => {
    async function loadSchemas() {
      try {
        setLoading(true);
        const data = await getSchemas();
        if (!data) return;
        setSchemas(data);
      } finally {
        setLoading(false);
      }
    }
    loadSchemas();
  }, []);


  const refreshSchemas = async () => {
    try {
      setLoading(true);
      await revalidateGetSchemas();
      const data = await getSchemas();
      setSchemas(data);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className={styles.page}>
      <PageHeader
        title="Schema Review Manager"
        description="Select to analyze your database schemas to generate AI workflows"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw size={14} />}
              onClick={refreshSchemas}
            >
              Refresh
            </Button>
            <Link href={selectedSchema ? `/schema/review/${selectedSchema?.id}` : '#'} >
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Bot size={14} />}
                onClick={() => { }}
                disabled={!!!selectedSchema}
              >
                AI Review <ChevronRight size={14} />
              </Button>
            </Link>
          </>
        }
      />
      <div className={styles.grid} style={{ gridTemplateColumns: "0.7fr 1fr" }}>
        <div className={styles.historySection}>
          <h4 className={styles.historyTitle}>Schema History</h4>
          {isLoading ? (
            <LoadingSkeleton height={52} count={3} />
          ) : schemas.length === 0 ? (
            <EmptyState title="No schemas" description="Upload your first schema above." />
          ) : (
            <div className={styles.historyList}>
              {schemas.map((s) => (
                <div key={s.id}
                  className={`${styles.historyItem} ${selectedSchema?.id === s.id ? styles.historyItemActive : ''}`}
                  onClick={() => setSelectedSchema(s)}>
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
                    : `${selectedSchema.rawContent.slice(0, 200)}...`}
                </SyntaxHighlighter>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SchemaReviewPage;