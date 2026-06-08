import { Handle, Position } from "reactflow";

export default function ERDNode({ data }: any) {
    return (
        <div
            style={{
                background: "#111827",
                border: "1px solid #374151",
                borderRadius: 8,
                minWidth: 220,
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    padding: "10px",
                    fontWeight: 700,
                    borderBottom: "1px solid #374151",
                }}
            >
                {data.name}
            </div>

            <div style={{ padding: "8px" }}>
                {data?.fields?.map((field: any) => (
                    <div
                        key={field.name}
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "2px 0",
                            fontSize: 12,
                        }}
                    >
                        <span>
                            {field.primaryKey && "🔑 "}
                            {field.name}
                        </span>

                        <span>{field.type}</span>
                    </div>
                ))}
            </div>

            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
        </div>
    );
}