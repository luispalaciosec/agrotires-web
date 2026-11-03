'use client';

import Link from 'next/link';
import { useState } from 'react';
import { getCategory, money, productHref, type Product } from '@/lib/catalog';
import { useStore } from './store';
import { Asset, Icon } from './ui';

export function ProductCard({ product: p }: { product: Product }) {
  const { wishlist, hydrated, addToCart, toggleWish, t, href, locale } = useStore();
  const saved = hydrated && wishlist.includes(p.id);
  const m = t.product;
  return (
    <article className="product-card">
      <div className="product-image-box photo-product">
        <Link href={href(productHref(p.id))} style={{ width: '100%', height: '100%', display: 'block' }} aria-label={`${m.viewPrefix}${p.name}`}>
          <Asset name={p.img} alt={m.imageAlt(p.name)} sizes="(max-width: 720px) 50vw, 300px" />
        </Link>
        <span className="sample-tag">{m.demo}</span>
        <button type="button" className={`product-wish ${saved ? 'is-saved' : ''}`} onClick={() => toggleWish(p.id)} aria-label={saved ? m.removeWish : m.saveWish} title={m.saveTitle}><Icon name="heart" size="sm" /></button>
      </div>
      <div className="product-info">
        <span className="product-cat">{getCategory(p.cat, locale)?.name || m.fallbackCat}</span>
        <Link href={href(productHref(p.id))} className="product-name">{p.name}</Link>
        <span className="product-sku">{p.sku}</span>
        <div className="product-bottom">
          <span className="product-price">{money(p.price)}<small>{m.illustrative}</small></span>
          <button type="button" className="add-button" onClick={() => addToCart(p.id)} aria-label={m.addAria(p.name)}><Icon name="plus" /></button>
        </div>
      </div>
    </article>
  );
}

export function DetailActions({ id }: { id: string }) {
  const { wishlist, hydrated, addToCart, toggleWish, t } = useStore();
  const [qty, setQty] = useState(1);
  const m = t.product;
  return (
    <div className="detail-actions">
      <div className="qty">
        <button type="button" aria-label={m.decrease} onClick={() => setQty(Math.max(1, qty - 1))}><Icon name="minus" size="sm" /></button>
        <span id="detail-quantity">{qty}</span>
        <button type="button" aria-label={m.increase} onClick={() => setQty(Math.min(99, qty + 1))}><Icon name="plus" size="sm" /></button>
      </div>
      <button className="btn" onClick={() => addToCart(id, qty)}>{m.add} <Icon name="cart" size="sm" /></button>
      <button className={`round-icon ${hydrated && wishlist.includes(id) ? 'active' : ''}`} onClick={() => toggleWish(id)} aria-label={m.saveTitle}><Icon name="heart" /></button>
    </div>
  );
}
