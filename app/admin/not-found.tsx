import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="admin-card">
      <h2>Not found</h2>
      <p style={{ fontSize: 13 }}>That record does not exist or was removed.</p>
      <Link className="text-link" href="/admin">Back to overview</Link>
    </div>
  );
}
