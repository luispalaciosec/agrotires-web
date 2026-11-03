import { EmptyState, PageHead } from '@/components/ui';

export default function NotFound() {
  return (
    <main id="main-content">
      <PageHead title="We couldn’t find that page." desc="The link may be outdated or the content is not part of this demo." crumbs="Page not found" />
      <div className="content-narrow"><EmptyState title="Let’s get you back on track." body="Explore the AGROTIRES sample catalog or return home." /></div>
    </main>
  );
}
