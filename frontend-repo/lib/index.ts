import { parsePrisma } from "./schema-parser/prisma";
import { parseSql } from "./schema-parser/sql";

export async function parseSchema(
  content: string,
  format: string
) {
  switch (format) {
    case "PRISMA":
      return parsePrisma(content);

    case "SQL":
      return parseSql(content);

    // case "json":
    //   return parseJson(content);

    // case "graphql":
    //   return parseGraphql(content);
  }
}