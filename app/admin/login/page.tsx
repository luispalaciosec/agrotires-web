import { redirect } from 'next/navigation';
import { adminConfigured, isAdmin } from '@/lib/server/admin-auth';
import { LoginForm } from '../forms';

export default async function LoginPage() {
  if (await isAdmin()) redirect('/admin');
  return (
    <div className="admin-login">
      <div className="form-card">
        <h2>AGROTIRES admin</h2>
        {adminConfigured() ? <LoginForm /> : <p style={{ fontSize: 13 }}>The admin panel is not configured yet. Run <code>npm run admin:setup</code> and restart the server.</p>}
      </div>
    </div>
  );
}
