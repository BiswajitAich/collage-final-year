
import {
  ParsedEntity,
  ParsedEnum,
  ParsedField,
  ParsedRelationship,
  ParsedSchema,
  PrismaRelationField,
} from "../types";
import {
  dedupeRelationships,
  extractBraceBody,
  normalisePrismaType,
  normaliseWhitespace,
  splitParenAware,
  stripComments,
} from "../utils";

interface ModelInfo {
  entity: ParsedEntity;
  relationFields: PrismaRelationField[];
  uniqueFields: Set<string>;
  pkFields: Set<string>;
}

type FieldParseResult =
  | { kind: "scalar"; parsed: ParsedField }
  | { kind: "relation"; relation: PrismaRelationField }
  | null;

interface RelationAttr {
  name?: string;
  fields?: string[];
  references?: string[];
}

export function parsePrisma(schema: string): ParsedSchema {
  const normalized = stripComments(normaliseWhitespace(schema), "prisma");

  const modelNames = collectNames(normalized, "model");
  const enumNames = collectNames(normalized, "enum");

  if (modelNames.size === 0) {
    throw new Error("parsePrisma: no model blocks found in schema");
  }

  const enums = parseEnums(normalized);
  const modelInfos = new Map<string, ModelInfo>();

  const modelRe = /\bmodel\s+(\w+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = modelRe.exec(normalized)) !== null) {
    const modelName = m[1];
    const bodyStart = normalized.indexOf("{", m.index);
    const body = extractBraceBody(normalized, bodyStart);
    if (body === null) continue;

    modelInfos.set(modelName, parseModelBody(modelName, body, modelNames, enumNames));
  }

  return {
    entities: [...modelInfos.values()].map((info) => info.entity),
    relationships: dedupeRelationships(resolveRelations(modelInfos)),
    enums,
  };
}

function collectNames(schema: string, keyword: string): Set<string> {
  const names = new Set<string>();
  const re = new RegExp(`\\b${keyword}\\s+(\\w+)\\s*\\{`, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(schema)) !== null) {
    names.add(match[1]);
  }
  return names;
}

function parseEnums(schema: string): ParsedEnum[] {
  const enums: ParsedEnum[] = [];
  const enumRe = /\benum\s+(\w+)\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = enumRe.exec(schema)) !== null) {
    const enumName = match[1];
    const bodyStart = schema.indexOf("{", match.index);
    const body = extractBraceBody(schema, bodyStart);
    if (body === null) continue;

    const values = body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("@@"))
      .map((line) => line.match(/^(\w+)/)?.[1] ?? "")
      .filter(Boolean);

    enums.push({ name: enumName, values });
  }

  return enums;
}

function parseModelBody(
  modelName: string,
  body: string,
  modelNames: Set<string>,
  enumNames: Set<string>
): ModelInfo {
  const scalarTypes = buildScalarSet();
  const scalarFields: ParsedField[] = [];
  const relationFields: PrismaRelationField[] = [];
  const uniqueFields = new Set<string>();
  const pkFields = new Set<string>();

  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("@@")) {
      if (line.startsWith("@@id")) {
        extractListArgs(line).forEach((name) => pkFields.add(name));
      }
      if (line.startsWith("@@unique")) {
        const uniqueCols = extractListArgs(line);
        if (uniqueCols.length === 1) {
          uniqueFields.add(uniqueCols[0]);
        }
      }
      continue;
    }

    const parsed = parseFieldLine(
      line,
      modelNames,
      enumNames,
      scalarTypes,
      pkFields,
      uniqueFields
    );

    if (!parsed) continue;
    if (parsed.kind === "scalar") {
      scalarFields.push(parsed.parsed);
    } else {
      relationFields.push(parsed.relation);
    }
  }

  for (const field of scalarFields) {
    if (pkFields.has(field.name)) {
      field.primaryKey = true;
      field.nullable = false;
    }
  }

  return {
    entity: { name: modelName, fields: scalarFields },
    relationFields,
    uniqueFields,
    pkFields,
  };
}

function parseFieldLine(
  line: string,
  modelNames: Set<string>,
  enumNames: Set<string>,
  scalarTypes: Set<string>,
  pkFields: Set<string>,
  uniqueFields: Set<string>
): FieldParseResult {
  const fieldRe = /^(\w+)\s+([A-Za-z_][A-Za-z0-9_]*)(\[\]|\?)?\s*(.*)$/;
  const match = line.match(fieldRe);
  if (!match) return null;

  const [, fieldName, baseType, modifier = "", attributes = ""] = match;
  const isList = modifier === "[]";
  const isOptional = modifier === "?";

  if (/^Unsupported\b/.test(baseType)) return null;

  const isRelation = modelNames.has(baseType);
  const isEnum = enumNames.has(baseType);
  const isScalar = scalarTypes.has(baseType) || isEnum;

  if (isRelation) {
    const relation = parseRelationAttribute(attributes);
    return {
      kind: "relation",
      relation: {
        fieldName,
        targetModel: baseType,
        isList,
        isOptional,
        relationName: relation.name,
        fields: relation.fields,
        references: relation.references,
      },
    };
  }

  if (!isScalar) return null;

  const upperAttrs = attributes.toUpperCase();
  const isId = /(?:^|\s)@ID\b/.test(upperAttrs);
  const isUnique = /(?:^|\s)@UNIQUE\b/.test(upperAttrs);
  const isPk = isId || pkFields.has(fieldName);
  const isFieldUnique = isUnique || uniqueFields.has(fieldName);

  if (isPk) pkFields.add(fieldName);
  if (isFieldUnique) uniqueFields.add(fieldName);

  return {
    kind: "scalar",
    parsed: {
      name: fieldName,
      type: isEnum ? baseType : normalisePrismaType(baseType),
      nullable: isOptional && !isPk,
      primaryKey: isPk,
      isArray: isList,
    },
  };
}

function parseRelationAttribute(attributeText: string): RelationAttr {
  const relationStart = attributeText.search(/@relation\(/);
  if (relationStart === -1) return {};

  const content = extractParenBodyString(attributeText, relationStart + "@relation".length);
  if (!content) return {};

  const result: RelationAttr = {};

  const positionalName = content.match(/^\s*"([^"]+)"/);
  if (positionalName) result.name = positionalName[1];

  const namedArg = content.match(/\bname\s*:\s*"([^"]+)"/);
  if (namedArg) result.name = namedArg[1];

  const fieldsArg = content.match(/\bfields\s*:\s*\[([^\]]*)\]/);
  if (fieldsArg) {
    result.fields = splitParenAware(fieldsArg[1], ",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  const referencesArg = content.match(/\breferences\s*:\s*\[([^\]]*)\]/);
  if (referencesArg) {
    result.references = splitParenAware(referencesArg[1], ",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return result;
}

function extractParenBodyString(text: string, fromIndex: number): string | null {
  let i = fromIndex;
  while (i < text.length && text[i] !== "(") i++;
  if (i >= text.length) return null;

  let depth = 0;
  let start = -1;
  for (; i < text.length; i++) {
    if (text[i] === "(") {
      if (depth === 0) start = i + 1;
      depth++;
      continue;
    }
    if (text[i] === ")") {
      depth--;
      if (depth === 0) return text.slice(start, i);
    }
  }

  return null;
}

function extractListArgs(attributeLine: string): string[] {
  const content = extractParenBodyString(attributeLine, 0);
  if (!content) return [];

  const bracketMatch = content.match(/\[([^\]]*)\]/);
  if (!bracketMatch) return [];

  return splitParenAware(bracketMatch[1], ",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function resolveRelations(modelInfos: Map<string, ModelInfo>): ParsedRelationship[] {
  const relationships: ParsedRelationship[] = [];
  const processed = new Set<string>();

  for (const [modelName, info] of modelInfos) {
    for (const relationField of info.relationFields) {
      if (!relationField.fields || relationField.fields.length === 0) continue;

      const key = `${modelName}.${relationField.fields.join(",")}->${relationField.targetModel}`;
      if (processed.has(key)) continue;
      processed.add(key);

      const targetInfo = modelInfos.get(relationField.targetModel);
      const backRef = targetInfo?.relationFields.find(
        (field) =>
          field.targetModel === modelName &&
          (!relationField.relationName || !field.relationName || relationField.relationName === field.relationName)
      );
      const relationType = resolveType(relationField, backRef, info);

      relationships.push({
        from: modelName,
        to: relationField.targetModel,
        fieldName: relationField.fields?.[0] ?? relationField.fieldName,
        foreignKeys: relationField.fields,
        references: relationField.references,
        relationType,
      });

      if (backRef) {
        const inverseType: ParsedRelationship["relationType"] =
          relationType === "many-to-one"
            ? "one-to-many"
            : relationType === "one-to-one"
              ? "one-to-one"
              : relationType === "one-to-many"
                ? "many-to-one"
                : "many-to-many";

        relationships.push({
          from: relationField.targetModel,
          to: modelName,
          fieldName: backRef.fieldName,
          relationType: inverseType,
        });
      }
    }
  }

  for (const [modelName, info] of modelInfos) {
    for (const relationField of info.relationFields) {
      if (!relationField.isList || relationField.fields) continue;

      const targetInfo = modelInfos.get(relationField.targetModel);
      if (!targetInfo) continue;

      const backRef = targetInfo.relationFields.find(
        (field) =>
          field.targetModel === modelName &&
          field.isList &&
          !field.fields &&
          (!relationField.relationName || !field.relationName || relationField.relationName === field.relationName)
      );

      if (!backRef) continue;

      const key = [modelName, relationField.targetModel].sort().join("<->") + (relationField.relationName ?? "");
      if (processed.has(key)) continue;
      processed.add(key);

      relationships.push({
        from: modelName,
        to: relationField.targetModel,
        fieldName: relationField.fields?.[0] ?? relationField.fieldName,
        relationType: "many-to-many",
      });
    }
  }

  return relationships;
}

function resolveType(
  fkSide: PrismaRelationField,
  backRef: PrismaRelationField | undefined,
  ownerInfo: ModelInfo
): ParsedRelationship["relationType"] {
  if (backRef?.isList) return "many-to-one";
  if (backRef && !backRef.isList) return "one-to-one";

  const fkField = fkSide.fields?.[0];
  if (!fkField) return "many-to-one";

  const fkIsPk = ownerInfo.pkFields.has(fkField);
  const fkIsUnique = ownerInfo.uniqueFields.has(fkField);
  return fkIsPk || fkIsUnique ? "one-to-one" : "many-to-one";
}

function buildScalarSet(): Set<string> {
  return new Set([
    "String",
    "Int",
    "BigInt",
    "Float",
    "Decimal",
    "Boolean",
    "DateTime",
    "Date",
    "Time",
    "Json",
    "Bytes",
  ]);
}