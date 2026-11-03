import type { Metadata } from 'next';
import Link from 'next/link';
import { Asset, Icon, PageHead } from '@/components/ui';

export const metadata: Metadata = { title: 'About', description: 'AGROTIRES is being designed as a more modern, less complicated way to explore agricultural solutions.', alternates: { canonical: '/about' } };

export default function AboutPage() {
  return (
    <main id="main-content">
      <PageHead title="Built around your operation." desc="AGROTIRES is being designed as a more modern, less complicated way to explore agricultural solutions." crumbs="About" />
      <section className="section">
        <div className="container">
          <div className="editorial">
            <div className="editorial-media"><Asset name="farm-hero.svg" alt="Illustration of an agricultural tractor" sizes="(max-width: 720px) 100vw, 680px" /></div>
            <div className="editorial-content">
              <div className="eyebrow">OUR DIRECTION</div>
              <h2>Instant Solution.<br />A better way forward.</h2>
              <p>The goal behind AGROTIRES is to make finding agricultural tires, replacement parts, equipment, and practical information simpler for everyone—from experienced producers to the next generation.</p>
              <Link href="/shop" className="btn">Explore the store <Icon name="arrow" size="sm" /></Link>
            </div>
          </div>
          <div className="simple-cards">
            <div className="simple-card"><Icon name="search" size="lg" /><h3>Clarity</h3><p>Present important product details in a way that&apos;s easier to understand.</p></div>
            <div className="simple-card"><Icon name="bolt" size="lg" /><h3>Simplicity</h3><p>Make discovery, browsing, and purchasing feel effortless.</p></div>
            <div className="simple-card"><Icon name="shield" size="lg" /><h3>Confidence</h3><p>Build around transparent product information and dependable service.</p></div>
          </div>
          <p style={{ margin: '26px 0 0', fontSize: 12 }}>This website preview does not claim any operating location, years in business, existing inventory or service coverage.</p>
        </div>
      </section>
    </main>
  );
}
