'use client';

import { useState } from 'react';
import { useStore } from './store';
import { Asset } from './ui';

// With one image this renders exactly the mockup's detail image; thumbnails appear only with more.
export function ProductGallery({ images, alt, tag }: { images: string[]; alt: string; tag: string }) {
  const { t } = useStore();
  const [current, setCurrent] = useState(0);
  return (
    <>
      <div className="detail-image photo-detail">
        <span className="sample-tag">{tag}</span>
        <Asset key={images[current]} name={images[current]} alt={alt} sizes="(max-width: 720px) 100vw, 640px" preload />
      </div>
      {images.length > 1 ? (
        <div className="detail-thumbs">
          {images.map((img, i) => (
            <button key={img} type="button" className="detail-thumb" aria-label={t.product.viewPhoto(i + 1, images.length)} aria-pressed={i === current} onClick={() => setCurrent(i)}>
              <Asset name={img} alt="" sizes="72px" />
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
