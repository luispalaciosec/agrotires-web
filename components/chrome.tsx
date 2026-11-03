'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { BUSINESS, catHref, categories, money } from '@/lib/catalog';
import { useStore } from './store';
import { Asset, EmptyState, Icon } from './ui';

export function useSearchNav() {
  const router = useRouter();
  return (q: string) => {
    const term = q.trim();
    router.push('/shop' + (term ? '?search=' + encodeURIComponent(term) : ''));
  };
}

export function SiteHeader() {
  const pathname = usePathname();
  const { wishlist, count, hydrated, setCartOpen } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigateSearch = useSearchNav();

  useEffect(() => setMenuOpen(false), [pathname]);

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const search = new FormData(e.currentTarget).get('search');
    setMenuOpen(false);
    navigateSearch(String(search || ''));
  };

  return (
    <>
      <div className="site-top">
        <div className="container">
          <div className="top-left"><Icon name="spark" size="xs" /> <span>Built for the next generation of agriculture.</span></div>
          <div className="top-right">
            <span className="tiny-dot" /><Link href="/help">INSTANT SOLUTION CENTER</Link><span className="top-divider">|</span>
            <a href={`mailto:${BUSINESS.contactEmail}`} className="top-email">{BUSINESS.contactEmail}</a><span className="top-divider">|</span>
            <span>USA · USD</span>
          </div>
        </div>
      </div>
      <div className="demo-ribbon"><strong>INTERACTIVE WEBSITE PREVIEW</strong> · All products, prices and availability are examples. No real payment or order submission.</div>
      <header className="header">
        <div className="container header-inner">
          <Link className="brand" href="/" aria-label="AGROTIRES homepage">
            <Asset className="brand-mark" name="agrotires-logo-web.webp" alt="Original AGROTIRES tractor and field emblem" sizes="64px" preload />
            <span><span className="brand-name">AGROTIRES</span><span className="brand-sub">INSTANT SOLUTION</span></span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link className={pathname === '/shop' ? 'nav-selected' : ''} href="/shop">Shop all</Link>
            <Link href={catHref('tires')}>Tires &amp; wheels</Link>
            <Link href={catHref('parts')}>Parts</Link>
            <Link href={catHref('equipment')}>Equipment</Link>
            <Link href="/finder?tab=part">Find my part</Link>
            <Link href="/help">Support</Link>
          </nav>
          <div className="header-tools">
            <form className="header-search" id="header-search" onSubmit={onSearch}>
              <Icon name="search" size="sm" />
              <input aria-label="Search products" name="search" placeholder="Search products..." autoComplete="off" />
            </form>
            <Link className="round-icon desktop-hide" href="/account" title="Customer account" aria-label="Customer account"><Icon name="user" /></Link>
            <Link className="round-icon desktop-hide" href="/wishlist" title="Saved products" aria-label="Saved products">
              <Icon name="heart" />{hydrated && wishlist.length ? <span className="count-bubble">{wishlist.length}</span> : null}
            </Link>
            <button className="round-icon" type="button" onClick={() => setCartOpen(true)} title="Shopping cart" aria-label="Shopping cart">
              <Icon name="cart" />{hydrated && count ? <span className="count-bubble">{count}</span> : null}
            </button>
            <button className="round-icon mobile-menu-button" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Open menu">
              <Icon name={menuOpen ? 'close' : 'menu'} />
            </button>
          </div>
        </div>
        <div className={`mobile-panel ${menuOpen ? 'open' : ''}`} onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setMenuOpen(false); }}>
          <form id="mobile-search" className="panel-search" onSubmit={onSearch}>
            <Icon name="search" /><input name="search" aria-label="Search products" placeholder="Search tires, parts, brands..." />
          </form>
          <Link href="/shop">Shop all <Icon name="right" /></Link>
          {categories.map((c) => (
            <Link key={c.id} href={c.id === 'machine' ? '/finder?tab=machine' : catHref(c.id)}>{c.name} <Icon name="right" /></Link>
          ))}
          <Link href="/wishlist">Saved products <Icon name="right" /></Link>
          <Link href="/help">Support <Icon name="right" /></Link>
          <Link href="/account">Account <Icon name="right" /></Link>
          <a href={`mailto:${BUSINESS.contactEmail}`}>Email AGROTIRES <Icon name="mail" /></a>
        </div>
      </header>
    </>
  );
}

export function BottomNav() {
  const { wishlist, count, hydrated, setCartOpen } = useStore();
  return (
    <nav className="mobile-bottom" aria-label="Quick navigation">
      <Link href="/"><Icon name="box" /><span>Home</span></Link>
      <Link href="/shop"><Icon name="search" /><span>Shop</span></Link>
      <Link href="/wishlist"><Icon name="heart" /><span>Saved</span>{hydrated && wishlist.length ? <i className="count-bubble">{wishlist.length}</i> : null}</Link>
      <button type="button" onClick={() => setCartOpen(true)}><Icon name="cart" /><span>Cart</span>{hydrated && count ? <i className="count-bubble">{count}</i> : null}</button>
    </nav>
  );
}

export function CartDrawer() {
  const { cart, count, total, cartOpen, setCartOpen, setQty, getProduct } = useStore();
  const closeButton = useRef<HTMLButtonElement>(null);
  const items = Object.entries(cart).filter(([id, qty]) => getProduct(id) && qty > 0);

  useEffect(() => {
    if (cartOpen) closeButton.current?.focus();
  }, [cartOpen]);

  return (
    <>
      <div className={`drawer-backdrop ${cartOpen ? 'open' : ''}`} onClick={() => setCartOpen(false)} />
      <aside className={`cart-drawer ${cartOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Shopping cart" aria-hidden={!cartOpen} inert={!cartOpen}>
        <div className="cart-head">
          <h2>Your demo cart <span className="muted mini">({count})</span></h2>
          <button ref={closeButton} className="round-icon" onClick={() => setCartOpen(false)} aria-label="Close cart"><Icon name="close" /></button>
        </div>
        <div className="cart-items">
          {items.length ? items.map(([id, qty]) => {
            const p = getProduct(id)!;
            return (
              <div className="cart-line" key={id}>
                <Asset name={p.img} alt="" sizes="75px" />
                <div>
                  <h4>{p.name}</h4>
                  <small>{p.sku}</small>
                  <div className="qty">
                    <button onClick={() => setQty(id, qty - 1)} aria-label="Reduce quantity"><Icon name="minus" size="sm" /></button>
                    <span>{qty}</span>
                    <button onClick={() => setQty(id, qty + 1)} aria-label="Increase quantity"><Icon name="plus" size="sm" /></button>
                  </div>
                  <button className="remove" onClick={() => setQty(id, 0)}>Remove</button>
                </div>
                <span className="price">{money(qty * p.price)}</span>
              </div>
            );
          }) : <EmptyState title="Your cart is ready" body="Add a sample product to see how easy shopping can be." btn="Browse products" />}
        </div>
        {items.length ? (
          <div className="cart-bottom">
            <div className="cart-total"><span>Sample subtotal</span><span>{money(total)}</span></div>
            <p>Demo prices only. Shipping, taxes and real purchases are not available yet.</p>
            <Link className="btn btn-block" href="/checkout" onClick={() => setCartOpen(false)}>Preview checkout <Icon name="arrow" size="sm" /></Link>
            <button style={{ background: 'transparent', color: 'var(--forest)', border: 0, width: '100%', padding: 13, fontSize: 12, fontWeight: 800 }} onClick={() => setCartOpen(false)}>Continue shopping</button>
          </div>
        ) : null}
      </aside>
    </>
  );
}

// The admin panel has its own navigation, so it renders without the store header and footer.
export function StoreChrome({ footer, children }: { footer: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return <>{children}</>;
  return (
    <>
      <SiteHeader />
      {children}
      {footer}
      <BottomNav />
      <CartDrawer />
    </>
  );
}

export function NewsletterForm() {
  const { toast } = useStore();
  return (
    <form id="newsletter-form" className="newsletter-form" onSubmit={(e) => { e.preventDefault(); toast('Preview only — signups will open at launch'); e.currentTarget.reset(); }}>
      <input aria-label="Email address" type="email" name="email" placeholder="Enter your email address" required />
      <button className="btn btn-yellow">Notify me <Icon name="arrow" size="sm" /></button>
    </form>
  );
}
