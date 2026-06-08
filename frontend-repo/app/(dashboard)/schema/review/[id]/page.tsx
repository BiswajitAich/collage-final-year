import { connection } from "next/server";
import SchemaReview from "./Review";
import { getSchemasById } from "../../action";
 
export default async function SchemaReviewPageById(
    props: { params: Promise<{ id: string }> }
) {
    // await connection();
    const { id } = await props.params;
 
    const selectedSchema = await getSchemasById(id);
    if (!selectedSchema) {
        throw new Error("Schema not found!");
    }

    return <SchemaReview key={selectedSchema.id} schema={selectedSchema} />;
}