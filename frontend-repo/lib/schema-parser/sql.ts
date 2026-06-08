import { ParsedSchema, ParsedEntity, RawRelationship, ParsedRelationship, ParsedField } from "../types";
import { stripComments, normaliseWhitespace, consumeIdentifier, extractParenBody, dedupeRelationships, splitParenAware, unquote, normaliseSqlType } from "../utils";

interface SqlRawRelationship extends RawRelationship {
  foreignKeys?: string[];
  references?: string[];
}

export function parseSql(schema: string): ParsedSchema {
  const normalized = stripComments(normaliseWhitespace(schema), "sql");

  validateParens(normalized);

  const uniquesByTable = new Map<string, Set<string>>();
  const pksByTable = new Map<string, Set<string>>();

  const entities: ParsedEntity[] = [];
  const rawRels: SqlRawRelationship[] = [];

  const createRe =
    /CREATE\s+(?:TEMPORARY\s+|TEMP\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/gi;
  let kwMatch: RegExpExecArray | null;

  while ((kwMatch = createRe.exec(normalized)) !== null) {
    const afterKw = normalized.slice(kwMatch.index + kwMatch[0].length);

    const ident = consumeIdentifier(afterKw);
    if (!ident) continue;

    const tableName = ident.name;
    if (!tableName) continue;

    const body = extractParenBody(ident.rest, 0);
    if (!body) continue;

    const tableUniques = new Set<string>();
    const tablePks = new Set<string>();
    uniquesByTable.set(tableName, tableUniques);
    pksByTable.set(tableName, tablePks);

    const { fields, rels } = parseTableBody(
      tableName,
      body,
      tablePks,
      tableUniques
    );

    if (fields.length > 0) {
      entities.push({ name: tableName, fields });
      rawRels.push(...rels);
    }
  }

  if (entities.length === 0) {
    throw new Error(
      "parseSql: no valid CREATE TABLE statements found in schema"
    );
  }

  const relationships: ParsedRelationship[] = rawRels.map((r) => {
    const pks = pksByTable.get(r.from);
    const uqs = uniquesByTable.get(r.from);

    const fkIsPk = pks ? pks.size === 1 && pks.has(r.field) : r.fkIsPk;
    const fkIsUnique = uqs?.has(r.field) ?? r.fkIsUnique;

    return {
      from: r.from,
      to: r.to,
      fieldName: r.field,
      foreignKeys: r.foreignKeys ?? [r.field],
      references: r.references,
      relationType: fkIsPk || fkIsUnique ? "one-to-one" : "many-to-one",
    };
  });

  return { entities, relationships: dedupeRelationships(relationships), enums: [] };
}

interface TableParseResult {
  fields: ParsedField[];
  rels: SqlRawRelationship[];
}

function parseTableBody(
  tableName: string,
  body: string,
  pkSet: Set<string>,
  uniqueSet: Set<string>
): TableParseResult {
  const fields: ParsedField[] = [];
  const rels: SqlRawRelationship[] = [];

  const clauses = splitParenAware(body, ",");

  for (const clause of clauses) {
    const trimmed = clause.trim();
    if (!trimmed) continue;

    if (isConstraintClause(trimmed)) {
      handleConstraint(tableName, trimmed, pkSet, uniqueSet, rels);
      continue;
    }

    const col = parseColumnClause(tableName, trimmed, pkSet, uniqueSet);
    if (col) {
      fields.push(col.field);
      if (col.rel) rels.push(col.rel);
    }
  }

  for (const f of fields) {
    if (pkSet.has(f.name)) {
      f.primaryKey = true;
      f.nullable = false;
    }
  }

  return { fields, rels };
}

function isConstraintClause(clause: string): boolean {
  const upper = clause.trimStart().toUpperCase();
  return (
    upper.startsWith("CONSTRAINT ") ||
    upper.startsWith("PRIMARY KEY") ||
    upper.startsWith("FOREIGN KEY") ||
    upper.startsWith("UNIQUE KEY") ||
    upper.startsWith("UNIQUE (") ||
    upper.startsWith("UNIQUE INDEX") ||
    upper.startsWith("CHECK ") ||
    upper.startsWith("INDEX ") ||
    /^KEY\s/.test(upper)
  );
}

function handleConstraint(
  tableName: string,
  clause: string,
  pkSet: Set<string>,
  uniqueSet: Set<string>,
  rels: SqlRawRelationship[]
): void {
  const upper = clause.toUpperCase();

  if (upper.includes("PRIMARY KEY")) {
    const body = extractParenBody(clause, 0);
    if (body) {
      splitParenAware(body, ",")
        .map((c) => unquote(c.trim()))
        .filter(Boolean)
        .forEach((col) => pkSet.add(col));
    }
    return;
  }

  if (upper.includes("FOREIGN KEY")) {
    const fkRe =
      /FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+[`"[\]]?(\w+)[`"[\]]?\s*\(([^)]*)\)/i;
    const m = clause.match(fkRe);
    if (m) {
      const fkFields = splitParenAware(m[1], ",")
        .map((c) => unquote(c.trim()))
        .filter(Boolean);
      const refFields = splitParenAware(m[3], ",")
        .map((c) => unquote(c.trim()))
        .filter(Boolean);
      const fkField = fkFields[0];
      if (!fkField) return;
      const refTable = m[2];

      rels.push({
        from: tableName,
        to: refTable,
        field: fkField,
        foreignKeys: fkFields,
        references: refFields,
        fkIsPk: pkSet.has(fkField),
        fkIsUnique: uniqueSet.has(fkField),
      });
    }
    return;
  }

  if (upper.includes("UNIQUE")) {
    const body = extractParenBody(clause, 0);
    if (body) {
      const cols = splitParenAware(body, ",").map((c) => unquote(c.trim()));
      if (cols.length === 1) uniqueSet.add(cols[0]);
    }
    return;
  }
}

interface ColumnParseResult {
  field: ParsedField;
  rel: SqlRawRelationship | null;
}

function parseColumnClause(
  tableName: string,
  clause: string,
  pkSet: Set<string>,
  uniqueSet: Set<string>
): ColumnParseResult | null {
  const nameRe = /^([`"[\]]?\w+[`"[\]]?)\s+/;
  const nameMatch = clause.match(nameRe);
  if (!nameMatch) return null;

  const fieldName = unquote(nameMatch[1]);
  const afterName = clause.slice(nameMatch[0].length);

  const typePart = extractColumnType(afterName);
  if (!typePart) return null;

  const colType = normaliseSqlType(typePart.type);
  const rest = typePart.rest;
  const upper = rest.toUpperCase();

  const isPk = /\bPRIMARY\s+KEY\b/.test(upper);
  const isUnique = /\bUNIQUE\b/.test(upper);
  const hasNotNull = /\bNOT\s+NULL\b/.test(upper);
  const nullable = !isPk && !hasNotNull;

  if (isPk) pkSet.add(fieldName);
  if (isUnique) uniqueSet.add(fieldName);

  let rel: SqlRawRelationship | null = null;
  const refRe =
    /\bREFERENCES\s+[`"[\]]?(\w+)[`"[\]]?\s*\(([^)]*)\)/i;
  const refMatch = rest.match(refRe);
  if (refMatch) {
    const referenceCols = splitParenAware(refMatch[2], ",")
      .map((c) => unquote(c.trim()))
      .filter(Boolean);

    rel = {
      from: tableName,
      to: refMatch[1],
      field: fieldName,
      foreignKeys: [fieldName],
      references: referenceCols,
      fkIsPk: isPk,
      fkIsUnique: isUnique,
    };
  }

  return {
    field: { name: fieldName, type: colType, nullable, primaryKey: isPk, isArray: /\[\]$/.test(colType) },
    rel,
  };
}

function extractColumnType(
  text: string
): { type: string; rest: string } | null {
  const tokens: string[] = [];
  let rest = text.trim();

  const multiWordTypes = [
    "TIMESTAMP WITH TIME ZONE",
    "TIMESTAMP WITHOUT TIME ZONE",
    "TIME WITH TIME ZONE",
    "TIME WITHOUT TIME ZONE",
    "DOUBLE PRECISION",
    "CHARACTER VARYING",
    "CHARACTER LARGE OBJECT",
    "BINARY LARGE OBJECT",
    "NATIONAL CHARACTER VARYING",
    "NATIONAL CHARACTER",
  ];
  for (const mwt of multiWordTypes) {
    if (rest.toUpperCase().startsWith(mwt)) {
      const after = rest.slice(mwt.length);
      const precMatch = after.match(/^\s*(\(\s*[\d,\s]+\s*\))/);
      const prec = precMatch ? precMatch[1] : "";
      const remainder = after.slice(prec.length).trimStart();
      return { type: (mwt + prec).toUpperCase(), rest: remainder };
    }
  }

  const wordRe = /^(\w+(?:\[\])?)\s*/;
  const wm = rest.match(wordRe);
  if (!wm) return null;

  tokens.push(wm[1]);
  rest = rest.slice(wm[0].length);

  const precRe = /^(\(\s*[\d,\s]+\s*\))\s*/;
  const pm = rest.match(precRe);
  if (pm) {
    tokens[tokens.length - 1] += pm[1];
    rest = rest.slice(pm[0].length);
  }

  return { type: tokens.join(""), rest };
}

function validateParens(schema: string): void {
  const opens = (schema.match(/\(/g) ?? []).length;
  const closes = (schema.match(/\)/g) ?? []).length;
  if (opens !== closes) {
    throw new Error(
      `parseSql: unbalanced parentheses - ${opens} '(' vs ${closes} ')'`
    );
  }
}