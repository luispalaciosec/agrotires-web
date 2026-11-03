import { requireAdmin } from '@/lib/server/admin-auth';
import { PageEditor } from '../../pages-forms';

export default async function NewPagePage() {
  await requireAdmin();
  return (
    <>
      <div className="admin-head"><div><h1>New page</h1></div></div>
      <PageEditor />
    </>
  );
}
