'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/events';
import { useStore } from './store';

export function ProductViewEvent({ id }: { id: string }) {
  const { locale } = useStore();
  useEffect(() => trackEvent('view_product', { productSlug: id, locale }), [id, locale]);
  return null;
}
