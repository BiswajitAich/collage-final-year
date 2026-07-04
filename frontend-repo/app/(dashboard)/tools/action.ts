"use server"
import prisma from "@/lib/prisma";

export async function getDbTools() {
  return await prisma.tool.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getDbToolByName(name: string) {
  return await prisma.tool.findUnique({ where: { name } });
}

export async function updateDbToolStatus(id: string, status: string) {
  return await prisma.tool.update({
    where: { id },
    data: { status: status as any, lastSync: new Date() },
  });
}

export async function syncDbTool(id: string) {
  return await prisma.tool.update({
    where: { id },
    data: { lastSync: new Date() },
  });
}
