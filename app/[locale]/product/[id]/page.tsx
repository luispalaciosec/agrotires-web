import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailActions, ProductCard } from '@/components/product';
import { Asset, Icon, JsonLd } from '@/components/ui';
import { DEMO_CATALOG, catHref, getCategory, money, productHref } from '@/lib/catalog';
import { LOCALE_TAGS, isLocale, localePath, type Locale } from '@/lib/i18n';
import { resolveLocale } from '@/lib/locale-params';
import { getPublicProducts } from '@/lib/products';
import { absolute, breadcrumbLd, languageAlternates } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'en';
  return (await getPublicProducts(locale)).map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await resolveLocale({ params });
  const id = decodeURIComponent((await params).id);
  const p = (await getPublicProducts(locale)).find((x) => x.id === id);
  if (!p) return {};
  return { title: p.name, description: p.desc, alternates: languageAlternates(locale, productHref(p.id)) };
}

export default async function ProductPage({ params }: Props) {
  const { locale, t } = await resolveLocale({ params });
  const id = decodeURIComponent((await params).id);
  const products = await getPublicProducts(locale);
  const p = products.find((x) => x.id === id);
  const c = p && getCategory(p.cat, locale);
  if (!p || !c) notFound();
  const m = t.product;
  const href = (path: string) => localePath(locale, path);
  const related = products.filter((x) => x.id !== p.id && (x.cat === p.cat || x.tags.some((tag) => p.tags.includes(tag)))).slice(0, 4);
  return (
    <main id="main-content">
      <JsonLd data={breadcrumbLd([[t.common.home, href('/')], [c.name, href(catHref(c.id))], [p.name, href(productHref(p.id))]])} />
      {/* Fictional prices must never be published as real offers. */}
      {!DEMO_CATALOG && (
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: p.name,
          sku: p.sku,
          description: p.desc,
          inLanguage: LOCALE_TAGS[locale],
          image: absolute(`/assets/${p.img}`),
          offers: { '@type': 'Offer', price: p.price, priceCurrency: 'USD', url: absolute(href(productHref(p.id))) },
        }} />
      )}
      <div className="container">
        <div className="breadcrumb" style={{ marginTop: 30 }}>
          <Link href={href('/')}>{t.common.home}</Link><Icon name="right" size="xs" /><Link href={href(catHref(p.cat))}>{c.name}</Link><Icon name="right" size="xs" />{p.name}
        </div>
        <div className="detail-layout">
          <div className="detail-image photo-detail">
            <span className="sample-tag">{m.demoImage}</span>
            <Asset name={p.img} alt={m.detailAlt(p.name)} sizes="(max-width: 720px) 100vw, 640px" preload />
          </div>
          <div className="detail-copy">
            <div className="eyebrow">{c.name}</div>
            <h1>{p.name}</h1>
            <span className="tag"><Icon name="info" size="xs" /> {m.example}</span>
            <div className="detail-price">{money(p.price)}</div>
            <p className="mini muted">{m.priceNote}</p>
            <p className="detail-intro">{p.desc}</p>
            <div className="notice"><Icon name="info" size="sm" /> {m.notice}</div>
            <DetailActions id={p.id} />
            <Link className="text-link" href={href('/quote')} style={{ marginTop: 25 }}>{m.more} <Icon name="arrow" size="sm" /></Link>
            <div className="detail-assurances">
              <div className="assurance"><Icon name="clipboard" /> {m.assure1}</div>
              <div className="assurance"><Icon name="truck" /> {m.assure2}</div>
            </div>
          </div>
        </div>
        <div className="detail-panels">
          <div className="two-col">
            <div>
              <h3>{m.details}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.9 }}>{p.desc}</p>
              <div className="notice">{m.detailsNotice}</div>
            </div>
            <div>
              <h3>{m.glance}</h3>
              <table className="spec-table">
                <tbody>
                  <tr><td>{m.sku}</td><td>{p.sku}</td></tr>
                  <tr><td>{m.department}</td><td>{c.name}</td></tr>
                  {p.brand ? <tr><td>{m.brand}</td><td>{p.brand}</td></tr> : null}
                  {p.tireSize ? <tr><td>{m.tireSize}</td><td>{p.tireSize}</td></tr> : null}
                  <tr><td>{m.price}</td><td>{money(p.price)} {m.sample}</td></tr>
                  <tr><td>{m.fitment}</td><td>{m.notVerified}</td></tr>
                  <tr><td>{m.availability}</td><td>{m.demoOnly}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="section-top">
            <div><div className="eyebrow">{m.continue}</div><h2 className="section-title">{m.related}</h2></div>
            <Link href={href(catHref(p.cat))} className="text-link">{m.seeCategory} <Icon name="arrow" size="sm" /></Link>
          </div>
          <div className="products-grid">{related.map((x) => <ProductCard key={x.id} product={x} />)}</div>
        </div>
      </section>
    </main>
  );
}
