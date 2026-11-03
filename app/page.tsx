import type { Metadata } from 'next';
import Link from 'next/link';
import { FinderSection, HeroSearch } from '@/components/finder';
import { ProductCard } from '@/components/product';
import { Asset, CategoryCard, GuideCard, Icon, eyebrowYellow } from '@/components/ui';
import { categories, guides } from '@/lib/catalog';
import { getPublicProducts } from '@/lib/products';

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
  const products = await getPublicProducts();
  return (
    <main id="main-content">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="hero-kicker"><span className="tiny-dot" />THE NEXT GENERATION OF FARM SUPPLY</div>
            <h1>Keep your farm <em>moving.</em></h1>
            <p className="hero-lede">Tires, parts, equipment, and everyday farm essentials. Discover the right solutions with less searching and more doing.</p>
            <div className="hero-actions">
              <Link className="btn" href="/shop">Explore products <Icon name="arrow" size="sm" /></Link>
              <Link className="btn btn-light" href="/finder?tab=part">Find my part <Icon name="right" size="sm" /></Link>
            </div>
            <div className="hero-proof">
              <span><Icon name="search" size="sm" /> Smarter discovery</span>
              <span><Icon name="shield" size="sm" /> Clarity first</span>
              <span><Icon name="bolt" size="sm" /> Made for your pace</span>
            </div>
          </div>
          <div className="hero-art">
            <Asset name="agrotires-farm-hero.webp" alt="Cinematic illustration of a tractor cultivating an agricultural field at golden hour" sizes="(max-width: 720px) 100vw, 720px" preload />
            <div className="hero-floating">
              <div className="hero-float-icon"><Icon name="compass" size="lg" /></div>
              <div><strong>Find what fits your work.</strong><small>Search by category, size or part number.</small></div>
            </div>
          </div>
        </div>
      </section>
      <HeroSearch />
      <div className="value-strip">
        <div className="container value-grid">
          <div className="value-item"><span className="value-icon"><Icon name="search" /></span><div><strong>Find it faster</strong><p>Search by what you know.</p></div></div>
          <div className="value-item"><span className="value-icon"><Icon name="clipboard" /></span><div><strong>Clear product details</strong><p>Less guesswork, more clarity.</p></div></div>
          <div className="value-item"><span className="value-icon"><Icon name="truck" /></span><div><strong>Freight-ready design</strong><p>Made for heavy-item shopping.</p></div></div>
          <div className="value-item"><span className="value-icon"><Icon name="user" /></span><div><strong>Here to help</strong><p>Get connected to support.</p></div></div>
        </div>
      </div>
      <section className="section">
        <div className="container">
          <div className="section-top">
            <div>
              <div className="eyebrow">WHAT YOUR FARM NEEDS</div>
              <h2 className="section-title">One place. Every possibility.</h2>
              <p className="section-caption">Start with a category, or jump straight to the part you need.</p>
            </div>
            <Link href="/shop" className="text-link">Explore the catalog <Icon name="arrow" size="sm" /></Link>
          </div>
          <div className="category-grid">{categories.map((c) => <CategoryCard key={c.id} category={c} />)}</div>
        </div>
      </section>
      <section className="discovery-edit container" aria-label="More ways to shop">
        <Link href="/finder?tab=tire" className="discovery-tile">
          <Asset name="agro-tires.webp" alt="Close-up illustration of heavy-duty agricultural tire tread" sizes="(max-width: 700px) 100vw, 620px" />
          <span className="discovery-tile-content"><span className="discover-mini">SHOP SMARTER</span><strong>Find your next tire.</strong><span>Start with size or application <Icon name="arrow" size="sm" /></span></span>
        </Link>
        <Link href="/finder?tab=machine" className="discovery-tile">
          <Asset name="agro-fieldwork.webp" alt="Modern tractor working in a field" sizes="(max-width: 700px) 100vw, 620px" />
          <span className="discovery-tile-content"><span className="discover-mini">BUILT FOR YOUR EQUIPMENT</span><strong>Start with your machine.</strong><span>Find the category you need <Icon name="arrow" size="sm" /></span></span>
        </Link>
      </section>
      <FinderSection />
      <section className="section">
        <div className="container">
          <div className="section-top">
            <div>
              <div className="eyebrow">EXPLORE THE EXPERIENCE</div>
              <h2 className="section-title">A better way to shop the farm.</h2>
              <p className="section-caption">Try our interactive sample catalog. Product names and prices are for demonstration only.</p>
            </div>
            <Link href="/shop" className="text-link">Shop all demo products <Icon name="arrow" size="sm" /></Link>
          </div>
          <div className="products-grid">{products.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </div>
      </section>
      <section className="section section-alt">
        <div className="container">
          <div className="editorial">
            <div className="editorial-media"><Asset name="agro-harvest.webp" alt="Illustrative aerial view of a combine working through golden crops" sizes="(max-width: 720px) 100vw, 680px" /></div>
            <div className="editorial-content">
              <div className="eyebrow">BUILT WITH REAL WORK IN MIND</div>
              <h2>More than a catalog.<br />A smarter solution.</h2>
              <p>From a simple search to a complex equipment inquiry, every detail is designed to help you move forward confidently.</p>
              <Link className="btn" href="/about">Discover AGROTIRES <Icon name="arrow" size="sm" /></Link>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-top">
            <div>
              <div className="eyebrow">KNOWLEDGE FOR THE FIELD</div>
              <h2 className="section-title">Learn something useful.</h2>
              <p className="section-caption">Practical starting points for choosing products with more confidence.</p>
            </div>
            <Link href="/guides" className="text-link">Browse all guides <Icon name="arrow" size="sm" /></Link>
          </div>
          <div className="guide-grid">{guides.map((g) => <GuideCard key={g.id} guide={g} />)}</div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{ background: 'var(--forest)', borderRadius: 21, padding: '45px 48px', display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div>
              <div className="eyebrow" style={eyebrowYellow}>INSTANT SOLUTION CENTER</div>
              <h2 style={{ color: 'white', fontSize: 'clamp(27px,3vw,39px)', margin: '10px 0' }}>Not sure which part you need?</h2>
              <p style={{ color: '#c2d8d0', margin: 0, fontSize: 13 }}>Prepare a product inquiry or request a freight quote with less hassle.</p>
            </div>
            <Link className="btn btn-yellow" href="/quote">Request a quote <Icon name="arrow" size="sm" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
