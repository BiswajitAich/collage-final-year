import { ParsedSchema } from "../types";

export function buildSchemaSummary(schema: ParsedSchema): string {
    return schema.entities
        .map((entity) => {
            const fields = entity.fields.map((field) => field.name).join(", ");

            return `${entity.name}(${fields})`;
        })
        .join("\n");
}
