import { requireAdmin } from '@/lib/server/admin-auth';
import { ImportForm } from '../../forms';

export default async function ImportPage() {
  await requireAdmin();
  return (
    <>
      <div className="admin-head"><h1>Import products</h1></div>
      <div className="admin-card">
        <p style={{ fontSize: 13 }}>Use the columns of <strong>AGROTIRES-product-import-template.csv</strong>. Existing SKUs are updated and new ones are created. If any line has a problem, nothing is imported and every problem is listed.</p>
        <p style={{ fontSize: 13 }}><code>category</code> uses: tires, parts, equipment, maintenance, technology. <code>image_filename</code> must be an image already available on the site, because photo upload is not available yet. For Spanish, add the optional columns <code>name_es</code> and <code>description_es</code>.</p>
        <ImportForm />
      </div>
    </>
  );
}
