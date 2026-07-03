import Link from 'next/link';

const page = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '16px' }}>
      <p style={{ color: '#666' }}>No schema selected.</p>
      <p style={{ color: '#888', fontSize: '14px' }}>
        Go to <Link href="/schema" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Schema Manager</Link>, upload a schema, and click &quot;Generate workflow&quot; from the AI review.
      </p>
    </div>
  );
}

export default page;