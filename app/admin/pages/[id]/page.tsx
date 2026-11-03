import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';
import { DeletePageButton, PageEditor } from '../../pages-forms';

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const page = await getStore()?.getPage(id).catch(() => undefined);
  if (!page) notFound();
  return (
    <>
      <div className="admin-head">
        <div><h1 data-raw>{page.titleEn}</h1></div>
        <DeletePageButton id={page.id} title={page.titleEn} />
      </div>
      <PageEditor key={page.updatedAt} page={page} />
    </>
  );
}
