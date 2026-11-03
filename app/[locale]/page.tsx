import type { Metadata } from 'next';
import Link from 'next/link';
import { FinderSection, HeroSearch } from '@/components/finder';
import { ProductCard } from '@/components/product';
import { Asset, CategoryCard, GuideCard, Icon, eyebrowYellow } from '@/components/ui';
import { getCategories, getGuides } from '@/lib/catalog';
import { localePath } from '@/lib/i18n';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { getPublicProducts } from '@/lib/products';
import { languageAlternates } from '@/lib/seo';

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const { locale } = await resolveLocale(props);
  return { alternates: languageAlternates(locale, '/') };
}

export default async function HomePage(props: LocaleParams) {
  const { locale, t } = await resolveLocale(props);
  const products = await getPublicProducts(locale);
  const h = t.home;
  const href = (p: string) => localePath(locale, p);
  return (
    <main id="main-content">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="hero-kicker"><span className="tiny-dot" />{h.kicker}</div>
            <h1>{h.titleA}<em>{h.titleB}</em></h1>
            <p className="hero-lede">{h.lede}</p>
            <div className="hero-actions">
              <Link className="btn" href={href('/shop')}>{t.common.explore} <Icon name="arrow" size="sm" /></Link>
              <Link className="btn btn-light" href={href('/finder?tab=part')}>{h.findPart} <Icon name="right" size="sm" /></Link>
            </div>
            <div className="hero-proof">
              <span><Icon name="search" size="sm" /> {h.proof1}</span>
              <span><Icon name="shield" size="sm" /> {h.proof2}</span>
              <span><Icon name="bolt" size="sm" /> {h.proof3}</span>
            </div>
          </div>
          <div className="hero-art">
            <Asset name="agrotires-farm-hero.webp" alt={h.heroAlt} sizes="(max-width: 720px) 100vw, 720px" preload />
            <div className="hero-floating">
              <div className="hero-float-icon"><Icon name="compass" size="lg" /></div>
              <div><strong>{h.floatTitle}</strong><small>{h.floatText}</small></div>
            </div>
          </div>
        </div>
      </section>
      <HeroSearch />
      <div className="value-strip">
        <div className="container value-grid">
          <div className="value-item"><span className="value-icon"><Icon name="search" /></span><div><strong>{h.value1}</strong><p>{h.value1b}</p></div></div>
          <div className="value-item"><span className="value-icon"><Icon name="clipboard" /></span><div><strong>{h.value2}</strong><p>{h.value2b}</p></div></div>
          <div className="value-item"><span className="value-icon"><Icon name="truck" /></span><div><strong>{h.value3}</strong><p>{h.value3b}</p></div></div>
          <div className="value-item"><span className="value-icon"><Icon name="user" /></span><div><strong>{h.value4}</strong><p>{h.value4b}</p></div></div>
        </div>
      </div>
      <section className="section">
        <div className="container">
          <div className="section-top">
            <div>
              <div className="eyebrow">{h.catEyebrow}</div>
              <h2 className="section-title">{h.catTitle}</h2>
              <p className="section-caption">{h.catCaption}</p>
            </div>
            <Link href={href('/shop')} className="text-link">{h.catLink} <Icon name="arrow" size="sm" /></Link>
          </div>
          <div className="category-grid">{getCategories(locale).map((c) => <CategoryCard key={c.id} category={c} locale={locale} />)}</div>
        </div>
      </section>
      <section className="discovery-edit container" aria-label={h.moreWays}>
        <Link href={href('/finder?tab=tire')} className="discovery-tile">
          <Asset name="agro-tires.webp" alt={h.tileAlt1} sizes="(max-width: 700px) 100vw, 620px" />
          <span className="discovery-tile-content"><span className="discover-mini">{h.tile1a}</span><strong>{h.tile1b}</strong><span>{h.tile1c} <Icon name="arrow" size="sm" /></span></span>
        </Link>
        <Link href={href('/finder?tab=machine')} className="discovery-tile">
          <Asset name="agro-fieldwork.webp" alt={h.tileAlt2} sizes="(max-width: 700px) 100vw, 620px" />
          <span className="discovery-tile-content"><span className="discover-mini">{h.tile2a}</span><strong>{h.tile2b}</strong><span>{h.tile2c} <Icon name="arrow" size="sm" /></span></span>
        </Link>
      </section>
      <FinderSection />
      <section className="section">
        <div className="container">
          <div className="section-top">
            <div>
              <div className="eyebrow">{h.prodEyebrow}</div>
              <h2 className="section-title">{h.prodTitle}</h2>
              <p className="section-caption">{h.prodCaption}</p>
            </div>
            <Link href={href('/shop')} className="text-link">{h.prodLink} <Icon name="arrow" size="sm" /></Link>
          </div>
          <div className="products-grid">{products.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </div>
      </section>
      <section className="section section-alt">
        <div className="container">
          <div className="editorial">
            <div className="editorial-media"><Asset name="agro-harvest.webp" alt={h.editAlt} sizes="(max-width: 720px) 100vw, 680px" /></div>
            <div className="editorial-content">
              <div className="eyebrow">{h.editEyebrow}</div>
              <h2>{h.editTitleA}<br />{h.editTitleB}</h2>
              <p>{h.editText}</p>
              <Link className="btn" href={href('/about')}>{h.editBtn} <Icon name="arrow" size="sm" /></Link>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-top">
            <div>
              <div className="eyebrow">{h.guideEyebrow}</div>
              <h2 className="section-title">{h.guideTitle}</h2>
              <p className="section-caption">{h.guideCaption}</p>
            </div>
            <Link href={href('/guides')} className="text-link">{h.guideLink} <Icon name="arrow" size="sm" /></Link>
          </div>
          <div className="guide-grid">{getGuides(locale).map((g) => <GuideCard key={g.id} guide={g} locale={locale} />)}</div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{ background: 'var(--forest)', borderRadius: 21, padding: '45px 48px', display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div>
              <div className="eyebrow" style={eyebrowYellow}>{h.ctaEyebrow}</div>
              <h2 style={{ color: 'white', fontSize: 'clamp(27px,3vw,39px)', margin: '10px 0' }}>{h.ctaTitle}</h2>
              <p style={{ color: '#c2d8d0', margin: 0, fontSize: 13 }}>{h.ctaText}</p>
            </div>
            <Link className="btn btn-yellow" href={href('/quote')}>{h.ctaBtn} <Icon name="arrow" size="sm" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
