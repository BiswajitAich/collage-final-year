import { Workflow } from "@/lib/types";
import WorkflowsPageComp from "./_comp/WorkflowsPageComp";
import { getWorkFlows } from "./action";

const WorkflowsPage = async () => {
  const workflowsData = await getWorkFlows();

  return (
    <WorkflowsPageComp workflowsData={workflowsData} />
  );
}

export default WorkflowsPage;