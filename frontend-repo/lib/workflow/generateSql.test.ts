import { describe, expect, it } from "vitest";
import { generateSql, type DatabaseOperation } from "./generateSql";
import type { ParsedSchema } from "../types";

const schema: ParsedSchema = {
    enums: [],
    relationships: [],
    entities: [
        {
            name: "addresses",
            fields: [
                { name: "id", type: "String", nullable: false, primaryKey: true, isArray: false },
                { name: "user_id", type: "String", nullable: false, primaryKey: false, isArray: false },
                { name: "street", type: "String", nullable: false, primaryKey: false, isArray: false },
                { name: "city", type: "String", nullable: false, primaryKey: false, isArray: false },
                { name: "status", type: "String", nullable: false, primaryKey: false, isArray: false },
                { name: "priority", type: "Int", nullable: false, primaryKey: false, isArray: false },
                { name: "is_default", type: "Boolean", nullable: false, primaryKey: false, isArray: false },
            ],
        },
    ],
};

function baseConfig(overrides: Partial<DatabaseOperation> = {}): DatabaseOperation {
    return {
        operation: "READ",
        entity: "addresses",
        fields: ["street", "city"],
        ...overrides,
    };
}

describe("generateSql", () => {
    it("produces a matching SQL placeholder and parameter expression for request.query", () => {
        const { sql, parameters } = generateSql(
            baseConfig({
                filters: [{ field: "street", source: "request.query", parameter: "street" }],
            }),
            schema,
        );

        expect(sql).toContain("WHERE street = $1");
        expect(parameters).toEqual(["={{$json.query.street}}"]);
    });

    it("produces a matching SQL placeholder and parameter expression for request.body", () => {
        const { sql, parameters } = generateSql(
            baseConfig({
                filters: [{ field: "street", source: "request.body", parameter: "street" }],
            }),
            schema,
        );

        expect(sql).toContain("WHERE street = $1");
        expect(parameters).toEqual(["={{$json.body.street}}"]);
    });

    it("produces a matching SQL placeholder and parameter expression for request.path", () => {
        const { sql, parameters } = generateSql(
            baseConfig({
                filters: [{ field: "street", source: "request.path", parameter: "street" }],
            }),
            schema,
        );

        expect(sql).toContain("WHERE street = $1");
        expect(parameters).toEqual(["={{$json.params.street}}"]);
    });

    it("produces a matching SQL placeholder and parameter expression for request.header", () => {
        const { sql, parameters } = generateSql(
            baseConfig({
                filters: [{ field: "street", source: "request.header", parameter: "x-street" }],
            }),
            schema,
        );

        expect(sql).toContain("WHERE street = $1");
        expect(parameters).toEqual(["={{$json.headers.x-street}}"]);
    });

    it("produces a matching SQL placeholder and parameter expression for workflow", () => {
        const { sql, parameters } = generateSql(
            baseConfig({
                filters: [{ field: "street", source: "workflow", parameter: "street" }],
            }),
            schema,
        );

        expect(sql).toContain("WHERE street = $1");
        expect(parameters).toEqual(["={{$json.street}}"]);
    });

    it("inlines auth filters using webhook query values", () => {
        const { sql, parameters } = generateSql(
            baseConfig({
                filters: [{ field: "user_id", source: "auth", parameter: "user_id" }],
            }),
            schema,
        );

        expect(sql).toContain("WHERE user_id = '{{ $json.query.user_id }}'");
        expect(parameters).toEqual([]);
    });

    it("produces a resolvable expression wrapping a string constant", () => {
        const { sql, parameters } = generateSql(
            baseConfig({
                filters: [{ field: "status", source: "constant", value: "active" }],
            }),
            schema,
        );

        expect(sql).toContain("WHERE status = $1");
        expect(parameters).toEqual([`={{ ${JSON.stringify("active")} }}`]);
        expect(parameters[0]).toBe('={{ "active" }}');
    });

    it("produces a resolvable expression wrapping a numeric constant", () => {
        const { sql, parameters } = generateSql(
            baseConfig({
                filters: [{ field: "priority", source: "constant", value: 1 }],
            }),
            schema,
        );

        expect(parameters).toEqual(["={{ 1 }}"]);
    });

    it("produces a resolvable expression wrapping a boolean constant", () => {
        const { sql, parameters } = generateSql(
            baseConfig({
                filters: [{ field: "is_default", source: "constant", value: true }],
            }),
            schema,
        );

        expect(parameters).toEqual(["={{ true }}"]);
    });

    it("keeps SQL placeholders and parameters aligned across multiple filters", () => {
        const { sql, parameters } = generateSql(
            baseConfig({
                filters: [
                    { field: "user_id", source: "auth", parameter: "user_id" },
                    { field: "street", source: "request.query", parameter: "street" },
                    { field: "status", source: "constant", value: "active" },
                ],
            }),
            schema,
        );

        expect(sql).toContain(
            "WHERE user_id = '{{ $json.query.user_id }}' AND street = $1 AND status = $2",
        );
        expect(parameters).toEqual([
            "={{$json.query.street}}",
            '={{ "active" }}',
        ]);
    });
});
