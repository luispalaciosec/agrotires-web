'use client';

import Link from 'next/link';
import { useState } from 'react';
import { getCategory, money, productHref, type Product } from '@/lib/catalog';
import { useStore } from './store';
import { Asset, Icon } from './ui';

export function ProductCard({ product: p }: { product: Product }) {
  const { wishlist, hydrated, addToCart, toggleWish } = useStore();
  const saved = hydrated && wishlist.includes(p.id);
  return (
    <article className="product-card">
      <div className="product-image-box photo-product">
        <Link href={productHref(p.id)} style={{ width: '100%', height: '100%', display: 'block' }} aria-label={`View ${p.name}`}>
          <Asset name={p.img} alt={`Illustrative image of agricultural equipment for ${p.name}`} sizes="(max-width: 720px) 50vw, 300px" />
        </Link>
        <span className="sample-tag">DEMO PRODUCT</span>
        <button type="button" className={`product-wish ${saved ? 'is-saved' : ''}`} onClick={() => toggleWish(p.id)} aria-label={`${saved ? 'Remove from' : 'Save to'} wishlist`} title="Save product"><Icon name="heart" size="sm" /></button>
      </div>
      <div className="product-info">
        <span className="product-cat">{getCategory(p.cat)?.name || 'Products'}</span>
        <Link href={productHref(p.id)} className="product-name">{p.name}</Link>
        <span className="product-sku">{p.sku}</span>
        <div className="product-bottom">
          <span className="product-price">{money(p.price)}<small>Illustrative price</small></span>
          <button type="button" className="add-button" onClick={() => addToCart(p.id)} aria-label={`Add ${p.name} to cart`}><Icon name="plus" /></button>
        </div>
      </div>
    </article>
  );
}

export function DetailActions({ id }: { id: string }) {
  const { wishlist, hydrated, addToCart, toggleWish } = useStore();
  const [qty, setQty] = useState(1);
  return (
    <div className="detail-actions">
      <div className="qty">
        <button type="button" aria-label="Decrease quantity" onClick={() => setQty(Math.max(1, qty - 1))}><Icon name="minus" size="sm" /></button>
        <span id="detail-quantity">{qty}</span>
        <button type="button" aria-label="Increase quantity" onClick={() => setQty(Math.min(99, qty + 1))}><Icon name="plus" size="sm" /></button>
      </div>
      <button className="btn" onClick={() => addToCart(id, qty)}>Add to demo cart <Icon name="cart" size="sm" /></button>
      <button className={`round-icon ${hydrated && wishlist.includes(id) ? 'active' : ''}`} onClick={() => toggleWish(id)} aria-label="Save product"><Icon name="heart" /></button>
    </div>
  );
}
