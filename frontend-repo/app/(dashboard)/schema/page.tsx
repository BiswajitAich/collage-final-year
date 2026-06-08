import SchemaPageComp from "./_comp/SchemaPageComp"
import { getSchemas } from "./action";

const SchemaPage = async() => {
  const schemasData = await getSchemas();
  return (
    <SchemaPageComp schemasData={schemasData}/>
  );
}

export default SchemaPage;