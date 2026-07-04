"use server"
import { getUser, logoutUser } from "@/app/(auth)/login/action";
import { parseSchema } from "@/lib";
import { Prisma } from "@/lib/generated/prisma/client";
import { mapUploadedSchema } from "@/lib/mapper";
import prisma from "@/lib/prisma";
import { UploadedSchema } from "@/lib/types";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
const helperGetSchemas = async (uploadedById: string) => {
    "use cache"
    cacheLife("hours");
    cacheTag(`initial-schema-${uploadedById}`);
    return await prisma.uploadedSchema.findMany({
        where: { uploadedById },
        orderBy: {
            uploadedAt: "desc",
        },
        take: 10,
    })
}
export async function getSchemas(): Promise<UploadedSchema[]> {
    const user = await getUser();
    if (!user) return [];

    const schemas = await helperGetSchemas(user.id);

    return schemas.map(mapUploadedSchema);
}

export async function revalidateGetSchemas() {
    const id = (await getUser())?.id;
    if (!id) return []
    revalidateTag(`initial-schema-${id}`, "max")
}
export async function revalidateGetSchemasById(id: string) {
    if (!id) return []
    revalidateTag(`initial-selected-review-${id}`, "max")
}

export async function getSchemasById(id: string): Promise<UploadedSchema | null> {
    "use cache"
    cacheLife("hours");
    cacheTag(`initial-selected-review-${id}`)
    const schema = await prisma.uploadedSchema.findFirst({
        where: { id },
    })
    // console.log(`initial-selected-review-${id}`, JSON.stringify(schema, null, 2));
    if (!schema) return null;
    const mapped = mapUploadedSchema(schema);
    return mapped;
}

export async function uploadSchemaAction(
  name: string,
  format: "PRISMA" | "SQL",
  content: string
) {
  try {
    const parsed = await parseSchema(content, format);
console.log(parsed);

    if (!parsed) {
      return {
        success: false as const,
        parsed: null,
        schemaId: null,
        error: "Invalid parsed schema",
      };
    }

    const user = await getUser();
    if (!user?.id) {
      await logoutUser();
      return {
        success: false as const,
        parsed: null,
        schemaId: null,
        error: "Unauthorized please log in!",
      };
    }

    // Ensure user exists in DB (session may have user ID from old database)
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as any,
        passwordHash: "",
      },
      update: {},
    });

    let schemaId: string | null = null;
    let persistenceError: string | null = null;

    try {
      const schemaRecord = await prisma.uploadedSchema.create({
        data: {
          name,
          format,
          rawContent: content,

          parsedJson: parsed as unknown as Prisma.InputJsonValue,

          entityCount: parsed.entities.length,
          relationshipCount: parsed.relationships.length,

          status: "PARSED",
          uploadedById: user.id,
        },
      });

      schemaId = schemaRecord.id;
    } catch (error) {
      return {
        success: false as const,
        parsed: null,
        schemaId: null,
        error:
          error instanceof Error
            ? error.message
            : "Parsed successfully but failed to save schema",
      };
    }

    return {
      success: true as const,
      parsed,
      schemaId,
      error: null,
    };
  } catch (error) {
    return {
      success: false as const,
      parsed: null,
      schemaId: null,
      error:
        error instanceof Error
          ? error.message
          : "Invalid schema",
    };
  }
}