import prisma from "@/lib/prisma";
import { ReviewAnalysis } from "@/app/(dashboard)/schema/review/[id]/action";
import NewWorkflowPage from "../../../_comp/NewWorkflowPage";
import { WorkflowGraphData } from "../../../workflow.schema";
import { cacheLife, cacheTag } from "next/cache";
const getCapabilites = async (schemaId: string, capabilityId: string) => {
    "use cache"
    cacheLife('seconds');
    cacheTag(`getCapabilites-${schemaId}-${capabilityId}`)
    const schema = await prisma.uploadedSchema.findUnique({
        where: { id: schemaId },
    });
    const analysis = schema?.analysisResult as ReviewAnalysis | undefined;

    return analysis?.capabilities.find(
        c => c.id === capabilityId
    ) ?? null;
}
const getWorkflow = async (schemaId: string, capabilityId: string) => {
    "use cache"
    cacheLife('seconds');
    cacheTag(`getWorkflow-${schemaId}-${capabilityId}`)
    return await prisma.workflow.findUnique({
        where: {
            schemaId_capabilityId: {
                schemaId,
                capabilityId,
            },
        },
        select: { id: true, workflowJson: true }
    }) ?? null;
}

const page = async (props: PageProps<'/workflows/new/[schemaId]/[capabilityId]'>) => {
    const { schemaId, capabilityId } = await props.params;
    const [capability, workflowRecord] = await Promise.all([
        getCapabilites(schemaId, capabilityId),
        getWorkflow(schemaId, capabilityId)
    ])
    const workflow = workflowRecord?.workflowJson as WorkflowGraphData | null;
    return (
        <NewWorkflowPage
            capability={capability}
            workflow={workflow}
            workflowId={workflowRecord?.id}
            schemaId={schemaId}
            capabilityId={capabilityId}
        />
    );
}

export default page;