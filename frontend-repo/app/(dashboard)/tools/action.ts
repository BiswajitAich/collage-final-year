"use server";
import prisma from "@/lib/prisma";
import { NODE_REGISTRY } from "@/lib/compiler/node-registry";
import { ToolRecord } from "@/lib/workflow/mappers";

export async function getDbTools() {
    const builtinTools: ToolRecord[] = Object.entries(NODE_REGISTRY).map(
        ([name, node]) => ({
            id: `builtin-${name}`,
            builtin: true,
            name,
            label: node.label,
            description: `${node.label} built-in node`,
            provider: "n8n",
            n8nType: node.n8nType,
            typeVersion: node.typeVersion,
            color: "#6366f1",
            category: node.category,
            apiBaseUrl: null,
            status: "ACTIVE",
            lastSync: null,
            config: structuredClone(node.exampleConfig),
        }),
    );
    const customTools: ToolRecord[] = (
        await prisma.tool.findMany({
            orderBy: { name: "asc" },
        })
    ).map((tool) => ({
        id: tool.id,
        name: tool.name,
        label: tool.label,
        description: tool.description ?? undefined,
        provider: tool.provider,
        n8nType: tool.n8nType,
        typeVersion: tool.typeVersion,
        color: tool.color,
        category: tool.category,
        apiBaseUrl: tool.apiBaseUrl,
        status: tool.status,
        lastSync: tool.lastSync,
        config: (tool.config as Record<string, unknown> | null) ?? {},
        builtin: false,
    }));

    return [...builtinTools, ...customTools];
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
