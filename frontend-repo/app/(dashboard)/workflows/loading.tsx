import { LoadingSkeleton } from "@/components/ui/UIComponents";

export default function WorkflowsLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <LoadingSkeleton height={40} width={200} rounded />
      <LoadingSkeleton height={32} rounded />
      <div style={{ display: 'flex', gap: 12 }}>
        <LoadingSkeleton height={80} width="25%" rounded />
        <LoadingSkeleton height={80} width="25%" rounded />
        <LoadingSkeleton height={80} width="25%" rounded />
        <LoadingSkeleton height={80} width="25%" rounded />
      </div>
      <LoadingSkeleton height={48} rounded />
      <LoadingSkeleton height={400} rounded />
    </div>
  );
}
