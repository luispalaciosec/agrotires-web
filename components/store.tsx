'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Product } from '@/lib/catalog';
import { Icon } from './ui';

export type Quote = { date: string; topic: string; name: string; email: string; phone: string; zip: string; product: string; message: string };
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

type Store = {
  hydrated: boolean;
  products: Product[];
  getProduct: (id: string) => Product | undefined;
  cart: Cart;
  wishlist: string[];
  quotes: Quote[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  count: number;
  total: number;
  addToCart: (id: string, qty?: number) => void;
  setQty: (id: string, n: number) => void;
  toggleWish: (id: string) => void;
  saveQuote: (q: Quote) => void;
  toast: (msg: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

export function StoreProvider({ children, products }: { children: ReactNode; products: Product[] }) {
  const [hydrated, setHydrated] = useState(false);
  const [cart, setCart] = useState<Cart>({});
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const nextToast = useRef(0);
  const pathname = usePathname();

  // Read after mount so the server HTML and the first client render match.
  useEffect(() => {
    setCart(getLS('agrotires-demo-cart', {}));
    setWishlist(getLS('agrotires-demo-wishlist', []));
    setQuotes(getLS('agrotires-demo-quotes', []));
    setHydrated(true);
  }, []);

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
    return {
    hydrated,
    products,
    getProduct,
    cart,
    wishlist,
    quotes,
    cartOpen,
    setCartOpen,
    count: Object.values(cart).reduce((n, v) => n + v, 0),
    total: Object.entries(cart).reduce((n, [id, qty]) => n + (getProduct(id)?.price || 0) * qty, 0),
    addToCart(id, qty = 1) {
      if (!getProduct(id)) return;
      const next = { ...cart, [id]: (cart[id] || 0) + qty };
      setCart(next);
      setLS('agrotires-demo-cart', next);
      toast('Added to your demo cart');
    },
    setQty(id, n) {
      if (!getProduct(id)) return;
      const next = { ...cart };
      if (n <= 0) delete next[id];
      else next[id] = Math.min(99, n);
      setCart(next);
      setLS('agrotires-demo-cart', next);
    },
    toggleWish(id) {
      const saved = wishlist.includes(id);
      const next = saved ? wishlist.filter((x) => x !== id) : [...wishlist, id];
      setWishlist(next);
      setLS('agrotires-demo-wishlist', next);
      toast(saved ? 'Removed from saved products' : 'Saved to your wishlist');
    },
    saveQuote(q) {
      const next = [...quotes, q];
      setQuotes(next);
      setLS('agrotires-demo-quotes', next);
    },
    toast,
    };
  }, [hydrated, products, cart, wishlist, quotes, cartOpen, toast]);

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
