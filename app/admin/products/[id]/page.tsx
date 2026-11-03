import { notFound } from 'next/navigation';
import { fitmentToText } from '@/lib/fitment';
import { requireAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';
import { DeleteProductButton, ProductForm } from '../../forms';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = decodeURIComponent((await params).id);
  const product = (await getStore()?.listProducts())?.find((p) => p.id === id);
  if (!product) notFound();
  const fitment = ((await getStore()?.listFitment().catch(() => [])) ?? []).filter((f) => f.productId === product.id);
  return (
    <>
      <div className="admin-head"><h1>{product.name}</h1><DeleteProductButton id={product.id} name={product.name} /></div>
      <ProductForm key={product.id} product={product} fitmentText={fitmentToText(fitment)} />
    </>
  );
}
