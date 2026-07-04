import { LoadingSkeleton } from "@/components/ui/UIComponents";

export default function SchemaLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <LoadingSkeleton height={40} width={250} rounded />
      <LoadingSkeleton height={24} width={400} rounded />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginTop: 24 }}>
        <LoadingSkeleton height={400} rounded />
        <LoadingSkeleton height={400} rounded />
      </div>
    </div>
  );
}
