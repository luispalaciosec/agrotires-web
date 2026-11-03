import { redirect } from 'next/navigation';
import { adminConfigured, isAdmin, usesSupabaseAuth } from '@/lib/server/admin-auth';
import { LoginForm } from '../forms';

export default async function LoginPage() {
  if (await isAdmin()) redirect('/admin');
  return (
    <div className="admin-login">
      <div className="form-card">
        <h2>AGROTIRES admin</h2>
        {adminConfigured() ? <LoginForm withEmail={usesSupabaseAuth()} /> : <p style={{ fontSize: 13 }}>The admin panel is not configured yet. Check the Supabase environment variables.</p>}
      </div>
    </div>
  );
}
