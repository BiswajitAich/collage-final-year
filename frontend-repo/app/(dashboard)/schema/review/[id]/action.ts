"use server";
import { Prisma } from '@/lib/generated/prisma/client';
import { GROQ_MODEL } from '@/lib/ai/llm';
import prisma from '@/lib/prisma';
import { groq } from '@ai-sdk/groq';
import { generateText, Output } from 'ai';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { buildReviewAnalysisPrompt } from '@/lib/ai/prompt';
import { UploadedSchema } from '@/lib/types';

export type ReviewAnalysis = {
    domain: string;
    summary: string;
    confidence: number;

    capabilities: {
        id: string;
        name: string;
        description: string;

        entities: string[];

        category:
        | "READ"
        | "CREATE"
        | "UPDATE"
        | "DELETE"
        | "SEARCH"
        | "REPORT"
        | "WORKFLOW";

        confidence: number;

        suggestedEndpoint: string;
        suggestedMethod:
        | "GET"
        | "POST"
        | "PUT"
        | "PATCH"
        | "DELETE";
    }[];

    businessRules: {
        id: string;
        rule: string;
        entities: string[];
        confidence: number;
    }[];

    suggestions: {
        title: string;
        reason: string;
        priority: "low" | "medium" | "high";
    }[];
};

type ReviewResponse =
    | {
        success: true;
        data: ReviewAnalysis;
    }
    | {
        success: false;
        error: string;
    };


export const generateReview = async (
    SCHEMA_JSON: Prisma.JsonValue,
    id: string,
    status: UploadedSchema['status']
): Promise<ReviewResponse> => {
    try {
        if (!SCHEMA_JSON) {
            throw new Error("Schema not send properly!");
        }
        const { text } = await generateText({
            model: groq(GROQ_MODEL),
            output: Output.json(z.object({
                domain: z.string(),
                summary: z.string(),
                confidence: z.number(),
                capabilities: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string(),
                        description: z.string(),
                        entities: z.array(z.string()),
                        confidence: z.number(),
                        category: z.enum(["READ", "CREATE", "UPDATE", "DELETE", "SEARCH", "REPORT", "WORKFLOW"]),
                        suggestedEndpoint: z.string(),
                        suggestedMethod: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
                    })
                ),
                businessRules: z.array(
                    z.object({
                        id: z.string(),
                        rule: z.string(),
                        entities: z.array(z.string()),
                        confidence: z.number(),
                    })
                ),
                suggestions: z.array(
                    z.object({
                        title: z.string(),
                        reason: z.string(),
                        priority: z.enum(["low", "medium", "high"]),
                    })
                ),
            })),
            prompt: buildReviewAnalysisPrompt(SCHEMA_JSON)
        });
        // console.log(JSON.stringify(text), null, 2);
        const analysis: ReviewAnalysis = JSON.parse(text);
        await prisma.uploadedSchema.update({
            where: { id },
            data: {
                analysisResult: analysis as Prisma.InputJsonValue as ReviewAnalysis,
                ...(status === 'PARSED' && {
                    status: "ANALYZED"
                }),
            }
        })
        revalidateTag(`initial-selected-review-${id}`, "max");
        return {
            data: analysis as Prisma.InputJsonValue as ReviewAnalysis,
            success: true
        };
    } catch (error) {
        console.error(error);
        return {
            success: false,
            error: error instanceof Error
                ? error.message
                : "Unknown error",
        };
    }

}

