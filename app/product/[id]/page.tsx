import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailActions, ProductCard } from '@/components/product';
import { Asset, Icon, JsonLd } from '@/components/ui';
import { DEMO_CATALOG, catHref, getCategory, money, productHref } from '@/lib/catalog';
import { getPublicProducts } from '@/lib/products';
import { absolute, breadcrumbLd } from '@/lib/seo';

type Props = { params: Promise<{ id: string }> };

export const generateStaticParams = async () => (await getPublicProducts()).map((p) => ({ id: p.id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeURIComponent((await params).id);
  const p = (await getPublicProducts()).find((x) => x.id === id);
  if (!p) return {};
  return { title: p.name, description: p.desc, alternates: { canonical: productHref(p.id) } };
}

export default async function ProductPage({ params }: Props) {
  const id = decodeURIComponent((await params).id);
  const products = await getPublicProducts();
  const p = products.find((x) => x.id === id);
  const c = p && getCategory(p.cat);
  if (!p || !c) notFound();
  const related = products.filter((x) => x.id !== p.id && (x.cat === p.cat || x.tags.some((t) => p.tags.includes(t)))).slice(0, 4);
  return (
    <main id="main-content">
      <JsonLd data={breadcrumbLd([['Home', '/'], [c.name, catHref(c.id)], [p.name, productHref(p.id)]])} />
      {/* Fictional prices must never be published as real offers. */}
      {!DEMO_CATALOG && (
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: p.name,
          sku: p.sku,
          description: p.desc,
          image: absolute(`/assets/${p.img}`),
          offers: { '@type': 'Offer', price: p.price, priceCurrency: 'USD', url: absolute(productHref(p.id)) },
        }} />
      )}
      <div className="container">
        <div className="breadcrumb" style={{ marginTop: 30 }}>
          <Link href="/">Home</Link><Icon name="right" size="xs" /><Link href={catHref(p.cat)}>{c.name}</Link><Icon name="right" size="xs" />{p.name}
        </div>
        <div className="detail-layout">
          <div className="detail-image photo-detail">
            <span className="sample-tag">DEMO PRODUCT · ILLUSTRATIVE IMAGE</span>
            <Asset name={p.img} alt={`Illustrative equipment image for ${p.name}`} sizes="(max-width: 720px) 100vw, 640px" preload />
          </div>
          <div className="detail-copy">
            <div className="eyebrow">{c.name}</div>
            <h1>{p.name}</h1>
            <span className="tag"><Icon name="info" size="xs" /> Example catalog item</span>
            <div className="detail-price">{money(p.price)}</div>
            <p className="mini muted">Illustrative price in USD · Not available for real purchase</p>
            <p className="detail-intro">{p.desc}</p>
            <div className="notice"><Icon name="info" size="sm" /> This is a design preview: pricing, product imagery, technical details, inventory and fitment are not confirmed.</div>
            <DetailActions id={p.id} />
            <Link className="text-link" href="/quote" style={{ marginTop: 25 }}>Need more information? Prepare an inquiry <Icon name="arrow" size="sm" /></Link>
            <div className="detail-assurances">
              <div className="assurance"><Icon name="clipboard" /> Clear specifications when the product catalog is connected</div>
              <div className="assurance"><Icon name="truck" /> Freight quotes will be available after setup</div>
            </div>
          </div>
        </div>
        <div className="detail-panels">
          <div className="two-col">
            <div>
              <h3>Product details</h3>
              <p style={{ fontSize: 13, lineHeight: 1.9 }}>{p.desc}</p>
              <div className="notice">Actual technical specifications and supplier documentation are still needed before products can be published for sale.</div>
            </div>
            <div>
              <h3>At a glance</h3>
              <table className="spec-table">
                <tbody>
                  <tr><td>SKU</td><td>{p.sku}</td></tr>
                  <tr><td>Department</td><td>{c.name}</td></tr>
                  {p.brand ? <tr><td>Brand</td><td>{p.brand}</td></tr> : null}
                  {p.tireSize ? <tr><td>Tire size</td><td>{p.tireSize}</td></tr> : null}
                  <tr><td>Price</td><td>{money(p.price)} (sample)</td></tr>
                  <tr><td>Fitment</td><td>Not verified</td></tr>
                  <tr><td>Availability</td><td>Demo item only</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="section-top">
            <div><div className="eyebrow">CONTINUE EXPLORING</div><h2 className="section-title">Related demo products</h2></div>
            <Link href={catHref(p.cat)} className="text-link">See category <Icon name="arrow" size="sm" /></Link>
          </div>
          <div className="products-grid">{related.map((x) => <ProductCard key={x.id} product={x} />)}</div>
        </div>
      </section>
    </main>
  );
}
