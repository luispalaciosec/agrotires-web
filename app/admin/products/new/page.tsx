import { requireAdmin } from '@/lib/server/admin-auth';
import { ProductForm } from '../../forms';

export default async function NewProductPage() {
  await requireAdmin();
  return (
    <>
      <div className="admin-head"><h1>Add product</h1></div>
      <ProductForm />
    </>
  );
}
