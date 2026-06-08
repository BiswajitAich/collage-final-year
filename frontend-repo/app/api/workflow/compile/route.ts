// ─── POST /api/workflow/deploy ────────────────────────────────────────────────
// Full pipeline: compile WorkflowIR → push to n8n → optionally activate.
//
// Request body:
//   {
//     ir: WorkflowIR,            // required
//     activate?: boolean,        // default: false
//     existingWorkflowId?: string // PATCH instead of POST
//   }
//
// Response 200:
//   { workflowId, workflowUrl, active, warnings? }
//
// Response 400: compilation errors
// Response 502: n8n API errors

import { NextRequest, NextResponse } from "next/server";
import { graphToN8n } from "@/lib/workflow/compiler";
import { deployToN8n, N8nClientError } from "@/lib/workflow/n8n-client";
import { WorkflowGraphData } from "@/app/(dashboard)/workflows/workflow.schema";
// import type { WorkflowIR } from "@/lib/workflow/types";

interface DeployRequestBody {
  ir: WorkflowGraphData;
  activate?: boolean;
  existingWorkflowId?: string;
}

export async function POST(req: NextRequest) {
  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: DeployRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const { ir, activate = false, existingWorkflowId } = body;

  if (!ir) {
    return NextResponse.json(
      { error: 'Request body must include an "ir" field' },
      { status: 400 }
    );
  }

  // ── Compile ────────────────────────────────────────────────────────────────
  const compileResult = graphToN8n(ir);

  if (!compileResult.success || !compileResult.workflow) {
    return NextResponse.json(
      {
        error: "Compilation failed",
        details: compileResult.errors ?? ["Unknown error"],
      },
      { status: 400 }
    );
  }

  // ── Deploy ─────────────────────────────────────────────────────────────────
  try {
    const deployResult = await deployToN8n(compileResult.workflow, {
      activate,
      existingWorkflowId,
    });

    return NextResponse.json(
      {
        ...deployResult,
        ...(compileResult.warnings?.length
          ? { warnings: compileResult.warnings }
          : {}),
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof N8nClientError) {
      return NextResponse.json(
        {
          error: "n8n deployment failed",
          detail: err.message,
          statusCode: err.statusCode,
        },
        { status: 502 }
      );
    }

    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}