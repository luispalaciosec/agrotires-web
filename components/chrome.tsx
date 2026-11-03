'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { BUSINESS, catHref, getCategories, money } from '@/lib/catalog';
import { LOCALES, localePath, stripLocale, type Locale } from '@/lib/i18n';
import { saveLanguage, useStore } from './store';
import { Asset, EmptyState, Icon } from './ui';

export function useSearchNav() {
  const router = useRouter();
  const { href } = useStore();
  return (q: string) => {
    const term = q.trim();
    router.push(href('/shop' + (term ? '?search=' + encodeURIComponent(term) : '')));
  };
}

const LANGUAGE_NAMES: Record<Locale, string> = { en: 'ENG', es: 'ESP' };

function LanguageSwitch({ separator }: { separator?: boolean }) {
  const { locale, t } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const path = stripLocale(pathname);

  const change = (e: MouseEvent, target: Locale) => {
    saveLanguage(target);
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    // Keeps the current search or category when changing language.
    router.push(localePath(target, path) + window.location.search);
  };

  return (
    <span className="language-switch" role="group" aria-label={t.top.language}>
      {LOCALES.map((l, i) => (
        <span key={l}>
          {separator && i > 0 ? <span className="top-divider"> | </span> : null}
          <a href={localePath(l, path)} hrefLang={l} lang={l} aria-current={l === locale ? 'true' : undefined} className={l === locale ? 'language-active' : ''} onClick={(e) => change(e, l)}>{LANGUAGE_NAMES[l]}</a>
        </span>
      ))}
    </span>
  );
}

function SiteHeader() {
  const pathname = usePathname();
  const { wishlist, count, hydrated, setCartOpen, t, href, locale } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigateSearch = useSearchNav();
  const n = t.nav;

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
          <div className="top-left"><Icon name="spark" size="xs" /> <span>{t.top.tagline}</span></div>
          <div className="top-right">
            <span className="tiny-dot" /><Link href={href('/help')}>{t.top.center}</Link><span className="top-divider">|</span>
            <a href={`mailto:${BUSINESS.contactEmail}`} className="top-email">{BUSINESS.contactEmail}</a><span className="top-divider">|</span>
            <span>{t.top.market}</span><span className="top-divider">|</span>
            <LanguageSwitch separator />
          </div>
        </div>
      </div>
      <div className="demo-ribbon"><strong>{t.ribbon.strong}</strong>{t.ribbon.text}</div>
      <header className="header">
        <div className="container header-inner">
          <Link className="brand" href={href('/')} aria-label={n.homeLabel}>
            <Asset className="brand-mark" name="agrotires-logo-web.webp" alt={n.logoAlt} sizes="64px" preload />
            <span><span className="brand-name">AGROTIRES</span><span className="brand-sub">INSTANT SOLUTION</span></span>
          </Link>
          <nav className="desktop-nav" aria-label={n.main}>
            <Link className={stripLocale(pathname) === '/shop' ? 'nav-selected' : ''} href={href('/shop')}>{n.shopAll}</Link>
            <Link href={href(catHref('tires'))}>{n.tires}</Link>
            <Link href={href(catHref('parts'))}>{n.parts}</Link>
            <Link href={href(catHref('equipment'))}>{n.equipment}</Link>
            <Link href={href('/finder?tab=part')}>{n.findPart}</Link>
            <Link href={href('/help')}>{n.support}</Link>
          </nav>
          <div className="header-tools">
            <form className="header-search" id="header-search" onSubmit={onSearch}>
              <Icon name="search" size="sm" />
              <input aria-label={n.search} name="search" placeholder={n.searchPlaceholder} autoComplete="off" />
            </form>
            <Link className="round-icon desktop-hide" href={href('/account')} title={n.account} aria-label={n.account}><Icon name="user" /></Link>
            <Link className="round-icon desktop-hide" href={href('/wishlist')} title={n.saved} aria-label={n.saved}>
              <Icon name="heart" />{hydrated && wishlist.length ? <span className="count-bubble">{wishlist.length}</span> : null}
            </Link>
            <button className="round-icon" type="button" onClick={() => setCartOpen(true)} title={n.cart} aria-label={n.cart}>
              <Icon name="cart" />{hydrated && count ? <span className="count-bubble">{count}</span> : null}
            </button>
            <button className="round-icon mobile-menu-button" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={n.openMenu}>
              <Icon name={menuOpen ? 'close' : 'menu'} />
            </button>
          </div>
        </div>
        <div className={`mobile-panel ${menuOpen ? 'open' : ''}`} onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setMenuOpen(false); }}>
          <form id="mobile-search" className="panel-search" onSubmit={onSearch}>
            <Icon name="search" /><input name="search" aria-label={n.search} placeholder={n.searchMobile} />
          </form>
          <div className="mobile-language"><span>{t.top.language}</span><LanguageSwitch /></div>
          <Link href={href('/shop')}>{n.shopAll} <Icon name="right" /></Link>
          {getCategories(locale).map((c) => (
            <Link key={c.id} href={href(c.id === 'machine' ? '/finder?tab=machine' : catHref(c.id))}>{c.name} <Icon name="right" /></Link>
          ))}
          <Link href={href('/wishlist')}>{n.saved} <Icon name="right" /></Link>
          <Link href={href('/help')}>{n.support} <Icon name="right" /></Link>
          <Link href={href('/account')}>{n.accountMenu} <Icon name="right" /></Link>
          <a href={`mailto:${BUSINESS.contactEmail}`}>{n.emailUs} <Icon name="mail" /></a>
        </div>
      </header>
    </>
  );
}

function BottomNav() {
  const { wishlist, count, hydrated, setCartOpen, t, href } = useStore();
  const n = t.nav;
  return (
    <nav className="mobile-bottom" aria-label={n.quick}>
      <Link href={href('/')}><Icon name="box" /><span>{n.home}</span></Link>
      <Link href={href('/shop')}><Icon name="search" /><span>{n.shop}</span></Link>
      <Link href={href('/wishlist')}><Icon name="heart" /><span>{n.savedShort}</span>{hydrated && wishlist.length ? <i className="count-bubble">{wishlist.length}</i> : null}</Link>
      <button type="button" onClick={() => setCartOpen(true)}><Icon name="cart" /><span>{n.cartShort}</span>{hydrated && count ? <i className="count-bubble">{count}</i> : null}</button>
    </nav>
  );
}

function CartDrawer() {
  const { cart, count, total, cartOpen, setCartOpen, setQty, getProduct, t, href, locale } = useStore();
  const closeButton = useRef<HTMLButtonElement>(null);
  const items = Object.entries(cart).filter(([id, qty]) => getProduct(id) && qty > 0);
  const c = t.cart;

  useEffect(() => {
    if (cartOpen) closeButton.current?.focus();
  }, [cartOpen]);

  return (
    <>
      <div className={`drawer-backdrop ${cartOpen ? 'open' : ''}`} onClick={() => setCartOpen(false)} />
      <aside className={`cart-drawer ${cartOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label={t.nav.cart} aria-hidden={!cartOpen} inert={!cartOpen}>
        <div className="cart-head">
          <h2>{c.title} <span className="muted mini">({count})</span></h2>
          <button ref={closeButton} className="round-icon" onClick={() => setCartOpen(false)} aria-label={c.close}><Icon name="close" /></button>
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
                    <button onClick={() => setQty(id, qty - 1)} aria-label={c.reduce}><Icon name="minus" size="sm" /></button>
                    <span>{qty}</span>
                    <button onClick={() => setQty(id, qty + 1)} aria-label={c.increase}><Icon name="plus" size="sm" /></button>
                  </div>
                  <button className="remove" onClick={() => setQty(id, 0)}>{c.remove}</button>
                </div>
                <span className="price">{money(qty * p.price)}</span>
              </div>
            );
          }) : <EmptyState locale={locale} title={c.emptyTitle} body={c.emptyBody} btn={c.emptyBtn} />}
        </div>
        {items.length ? (
          <div className="cart-bottom">
            <div className="cart-total"><span>{c.subtotal}</span><span>{money(total)}</span></div>
            <p>{c.note}</p>
            <Link className="btn btn-block" href={href('/checkout')} onClick={() => setCartOpen(false)}>{c.preview} <Icon name="arrow" size="sm" /></Link>
            <button style={{ background: 'transparent', color: 'var(--forest)', border: 0, width: '100%', padding: 13, fontSize: 12, fontWeight: 800 }} onClick={() => setCartOpen(false)}>{c.keepShopping}</button>
          </div>
        ) : null}
      </aside>
    </>
  );
}

export function StoreChrome({ footer, children }: { footer: React.ReactNode; children: React.ReactNode }) {
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
  const { toast, t } = useStore();
  const f = t.footer;
  return (
    <form id="newsletter-form" className="newsletter-form" onSubmit={(e) => { e.preventDefault(); toast(f.toast); e.currentTarget.reset(); }}>
      <input aria-label={f.emailLabel} type="email" name="email" placeholder={f.emailPlaceholder} required />
      <button className="btn btn-yellow">{f.notify} <Icon name="arrow" size="sm" /></button>
    </form>
  );
}
