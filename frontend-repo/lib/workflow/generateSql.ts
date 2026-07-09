import { ParsedSchema } from "../types";
export type FilterSource =
    | "request.query"
    | "request.body"
    | "request.path"
    | "request.header"
    | "workflow"
    | "auth"
    | "constant";

export interface DatabaseFilter {
    field: string;
    source: FilterSource;
    parameter?: string;
    value?: string | number | boolean;
}
export interface DatabaseOperation {
    operation: "READ" | "LOOKUP" | "SEARCH" | "AGGREGATE";
    entity: string;
    fields: string[];
    filters?: DatabaseFilter[];
    sort?: {
        field: string;
        direction: "ASC" | "DESC";
    }[];
    limit?: number;
}
export interface GeneratedSql {
    sql: string;
    parameters: string[];
}

function authQueryParameter(filter: DatabaseFilter): string {
    if (typeof filter.field === "string" && filter.field.trim()) {
        return filter.field.trim();
    }

    if (typeof filter.parameter === "string" && filter.parameter.trim()) {
        return filter.parameter
            .trim()
            .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
            .toLowerCase();
    }

    return "user_id";
}

function toSqlLiteral(value: string | number | boolean): string {
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    return `'${value.replace(/'/g, "''")}'`;
}

export function generateSql(
    config: DatabaseOperation,
    schema: ParsedSchema,
): GeneratedSql {
    if (!config.entity) {
        throw new Error("Database node missing entity.");
    }

    // Find entity from parsed schema
    const entity = schema.entities.find(
        (e) => e.name.toLowerCase() === config.entity.toLowerCase(),
    );

    if (!entity) {
        throw new Error(`Entity "${config.entity}" not found in schema.`);
    }
    console.log("Entity----------------------");
    console.log("Entity:", entity.name);
    console.log(
        "Allowed columns:",
        entity.fields.map((f) => f.name),
    );
    console.log("Requested fields:", config.fields);
    console.log("Entity----------------------");
    // Table name (currently same as entity name)
    const table = entity.name;

    // Allowed columns
    const allowedColumns = entity.fields.map((f) => f.name);

    // SELECT fields
    const fields =
        config.fields && config.fields.length > 0
            ? config.fields.filter((f) => allowedColumns.includes(f))
            : allowedColumns;

    if (fields.length === 0) {
        throw new Error(`No valid fields requested for ${entity.name}.`);
    }

    let sql = `SELECT ${fields.join(", ")} FROM ${table}`;
    const parameters: string[] = [];
    let parameterIndex = 1;

    // WHERE clause
    if (config.filters?.length) {
        const clauses: string[] = [];

        for (const filter of config.filters) {
            if (!allowedColumns.includes(filter.field)) {
                continue;
            }

            switch (filter.source) {
                case "request.query":
                    parameters.push(`={{$json.query.${filter.parameter}}}`);
                    clauses.push(`${filter.field} = $${parameterIndex++}`);
                    break;

                case "request.body":
                    parameters.push(`={{$json.body.${filter.parameter}}}`);
                    clauses.push(`${filter.field} = $${parameterIndex++}`);
                    break;

                case "request.path":
                    parameters.push(`={{$json.params.${filter.parameter}}}`);
                    clauses.push(`${filter.field} = $${parameterIndex++}`);
                    break;

                case "request.header":
                    parameters.push(`={{$json.headers.${filter.parameter}}}`);
                    clauses.push(`${filter.field} = $${parameterIndex++}`);
                    break;

                case "workflow":
                    parameters.push(`={{$json.${filter.parameter}}}`);
                    clauses.push(`${filter.field} = $${parameterIndex++}`);
                    break;

                case "auth": {
                    const parameterName = authQueryParameter(filter);
                    clauses.push(
                        `${filter.field} = '{{ $json.query.${parameterName} }}'`,
                    );
                    break;
                }

                case "constant":
                    // Wrapped as a resolvable expression so it survives being
                    // combined with other parameters into a single
                    // `options.queryReplacement` string (see mappers.ts).
                    // n8n only evaluates `{{ ... }}` blocks in that string —
                    // any bare literal text outside of one is silently dropped.
                    parameters.push(`={{ ${JSON.stringify(filter.value)} }}`);
                    clauses.push(`${filter.field} = $${parameterIndex++}`);
                    break;
            }

            // clauses.push(`${filter.field} = {{$json.${filter.parameter}}}`);
        }

        if (clauses.length) {
            sql += ` WHERE ${clauses.join(" AND ")}`;
        }
    }

    // ORDER BY
    if (config.sort?.length) {
        const order = config.sort
            .filter((s) => allowedColumns.includes(s.field))
            .map((s) => `${s.field} ${s.direction}`);

        if (order.length) {
            sql += ` ORDER BY ${order.join(", ")}`;
        }
    }

    // LIMIT
    if (config.limit) {
        sql += ` LIMIT ${config.limit}`;
    }

    return {
        sql,
        parameters,
    };
}
