import { uploadSchemaAction } from "@/app/(dashboard)/schema/action";
import { UploadedSchema } from "./types";
import { Prisma } from "./generated/prisma/client";

export function normalizeRelationType(
    type: string,
): "one-to-one" | "one-to-many" | "many-to-many" {
    switch (type) {
        case "one-to-one":
            return "one-to-one";
        case "one-to-many":
            return "one-to-many";
        case "many-to-one":
            return "one-to-many"; // flip: FK side → reference side
        case "many-to-many":
            return "many-to-many";
        default:
            return "one-to-many";
    }
}

export function mapParsedSchema(
    name: string,
    format: "PRISMA" | "SQL",
    content: string,
    result: Awaited<ReturnType<typeof uploadSchemaAction>>,
): UploadedSchema {
    const parsed = result.parsed;
    return {
        id: result.schemaId ?? crypto.randomUUID(),
        name,
        format,
        rawContent: content,
        parsedJson: parsed
            ? (JSON.parse(JSON.stringify(parsed)) as Prisma.JsonValue)
            : null,
        analysisResult: null,
        uploadedAt: new Date().toISOString(),
        status: result.success ? "PARSED" : "ERROR",
        entityCount: parsed?.entities?.length ?? 0,
        relationshipCount: parsed?.relationships?.length ?? 0,
        entities:
            parsed?.entities?.map((e, i) => ({
                id: String(i),
                name: e.name,
                tableName: e.name,

                fields: (e.fields ?? []).map((f: any) => ({
                    name: f.name,
                    type: f.type,
                    isRequired: !f.nullable,
                    isUnique: !!f.unique,
                    isPrimary: !!f.primaryKey,
                    isForeign: false,
                    defaultValue: undefined,
                    description: "",
                })),

                fieldCount: e.fields?.length ?? 0,
                description: "",
                isJunction: false,
            })) ?? [],
        relationships:
            parsed?.relationships?.map((rel, i) => ({
                id: String(i),
                fromEntity: rel.from,
                toEntity: rel.to,
                type: normalizeRelationType(rel.relationType),
                fieldName:
                    rel.fieldName ??
                    rel.fieldName ??
                    rel.foreignKeys?.[0] ??
                    "",
                description: "",
                confidence: 1,
            })) ?? [],
    };
}

// mapUploadedSchema — fix entities (add fields) AND relationships (correct keys)
export function mapUploadedSchema(schema: any): UploadedSchema {
    const parsed = schema.parsedJson as {
        entities?: Array<{ name: string; fields?: any[] }>;
        relationships?: Array<{
            from: string;
            to: string;
            relationType: string;
            fieldName?: string;
            foreignKeys?: string[];
        }>;
    } | null;

    return {
        id: schema.id,
        name: schema.name,
        format: schema.format,
        rawContent: schema.rawContent,
        parsedJson: schema.parsedJson,
        analysisResult: schema.analysisResult,
        uploadedAt: schema.uploadedAt.toISOString(),
        status: schema.status,
        entityCount: schema.entityCount,
        relationshipCount: schema.relationshipCount,

        // ✅ Was missing fields — caused NaN positions & blank ERD nodes
        entities:
            parsed?.entities?.map((e, i) => ({
                id: String(i),
                name: e.name,
                tableName: e.name,
                fields: (e.fields ?? []).map((f: any) => ({
                    name: f.name,
                    type: f.type,
                    isRequired: !f.nullable,
                    isUnique: !!f.unique,
                    isPrimary: !!f.primaryKey,
                    isForeign: false,
                    defaultValue: undefined,
                    description: "",
                })),
                fieldCount: e.fields?.length ?? 0,
                description: "",
                isJunction: false,
            })) ?? [],

        // ✅ Was returning raw { from, to, relationType } — component expects fromEntity/toEntity/type
        relationships:
            parsed?.relationships?.map((rel, i) => ({
                id: String(i),
                fromEntity: rel.from,
                toEntity: rel.to,
                type: normalizeRelationType(rel.relationType),
                fieldName: rel.fieldName ?? rel.foreignKeys?.[0] ?? "",
                description: "",
                confidence: 1,
            })) ?? [],
    };
}
