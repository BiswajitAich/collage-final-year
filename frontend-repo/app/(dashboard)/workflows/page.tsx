import WorkflowsPageComp from "./_comp/WorkflowsPageComp";
import { getWorkFlows } from "./new/addWorkflowToN8n.action";

const WorkflowsPage = async () => {
    const workflowsData = await getWorkFlows();

    return <WorkflowsPageComp workflowsData={workflowsData} />;
};

export default WorkflowsPage;
