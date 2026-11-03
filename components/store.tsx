'use client';

import { trackEvent } from '@/lib/events';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Product } from '@/lib/catalog';
import { localePath, type Locale } from '@/lib/i18n';
import { messages } from '@/lib/messages';
import { Icon } from './ui';

type Cart = Record<string, number>;

const getLS = <T,>(key: string, fall: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fall : JSON.parse(v);
  } catch {
    return fall;
  }
};
const setLS = (key: string, val: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
};

export const LANGUAGE_KEY = 'agrotires-language';
export const saveLanguage = (locale: Locale) => setLS(LANGUAGE_KEY, locale);

type Store = {
  locale: Locale;
  t: (typeof messages)['en'];
  href: (path: string) => string;
  hydrated: boolean;
  products: Product[];
  getProduct: (id: string) => Product | undefined;
  cart: Cart;
  wishlist: string[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  count: number;
  total: number;
  addToCart: (id: string, qty?: number) => void;
  setQty: (id: string, n: number) => void;
  clearCart: () => void;
  toggleWish: (id: string) => void;
  toast: (msg: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

const saveWishlist = (items: string[]) => fetch('/api/account/wishlist', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }) }).catch(() => undefined);

export function StoreProvider({ children, products, locale }: { children: ReactNode; products: Product[]; locale: Locale }) {
  const [hydrated, setHydrated] = useState(false);
  const [cart, setCart] = useState<Cart>({});
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const nextToast = useRef(0);
  const accountList = useRef(false);
  const pathname = usePathname();
  const router = useRouter();

  // Read after mount so the server HTML and the first client render match.
  useEffect(() => {
    setCart(getLS('agrotires-demo-cart', {}));
    const localList = getLS<string[]>('agrotires-demo-wishlist', []);
    setWishlist(localList);
    // A signed-in customer keeps favorites across devices. Only then is there a session cookie to check.
    if (document.cookie.includes('sb-')) {
      fetch('/api/account/wishlist').then((r) => r.json()).then((body) => {
        if (!body?.signedIn) return;
        accountList.current = true;
        const merged = [...new Set([...body.items, ...localList])] as string[];
        setWishlist(merged);
        setLS('agrotires-demo-wishlist', merged);
        if (merged.length !== body.items.length) void saveWishlist(merged);
      }).catch(() => {});
    }
    setHydrated(true);
    // Only someone who chose Spanish before returns to it, and only from the home page;
    // shared links and search engines always get the language in the URL.
    if (window.location.pathname === '/' && getLS<string>(LANGUAGE_KEY, 'en') === 'es') router.replace('/es');
  }, [router]);

  useEffect(() => setCartOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = cartOpen ? 'hidden' : '';
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCartOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cartOpen]);

  const toast = useCallback((msg: string) => {
    const id = nextToast.current++;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const value = useMemo<Store>(() => {
    const getProduct = (id: string) => products.find((p) => p.id === id);
    const t = messages[locale];
    return {
      locale,
      t,
      href: (path) => localePath(locale, path),
      hydrated,
      products,
      getProduct,
      cart,
      wishlist,
      cartOpen,
      setCartOpen,
      count: Object.values(cart).reduce((n, v) => n + v, 0),
      total: Object.entries(cart).reduce((n, [id, qty]) => n + (getProduct(id)?.price || 0) * qty, 0),
      addToCart(id, qty = 1) {
        if (!getProduct(id)) return;
        const next = { ...cart, [id]: (cart[id] || 0) + qty };
        setCart(next);
        setLS('agrotires-demo-cart', next);
        toast(t.cart.added);
        trackEvent('add_to_cart', { productSlug: id, locale });
      },
      setQty(id, n) {
        if (!getProduct(id)) return;
        const next = { ...cart };
        if (n <= 0) delete next[id];
        else next[id] = Math.min(99, n);
        setCart(next);
        setLS('agrotires-demo-cart', next);
      },
      clearCart() {
        setCart({});
        setLS('agrotires-demo-cart', {});
      },
      toggleWish(id) {
        const saved = wishlist.includes(id);
        const next = saved ? wishlist.filter((x) => x !== id) : [...wishlist, id];
        setWishlist(next);
        setLS('agrotires-demo-wishlist', next);
        if (accountList.current) void saveWishlist(next);
        toast(saved ? t.cart.removed : t.cart.saved);
      },
      toast,
    };
  }, [locale, hydrated, products, cart, wishlist, cartOpen, toast]);

  return (
    <StoreContext.Provider value={value}>
      {children}
      <div id="toast-region" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div className="toast" key={t.id}><Icon name="check" /><span>{t.msg}</span></div>
        ))}
      </div>
    </StoreContext.Provider>
  );
}
