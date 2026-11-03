'use client';

import { useLayoutEffect } from 'react';
import { Icon } from '@/components/ui';
import { toSpanish } from '@/lib/admin-i18n';

const ATTRIBUTES = ['placeholder', 'aria-label', 'title', 'alt'];
// What people typed or wrote: the fields themselves, and the customer's own text in the panel.
const SKIP = 'textarea, script, style, .admin-pre, [data-raw]';

function translateNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.nodeValue ?? '';
    const text = value.trim();
    if (!text || node.parentElement?.closest(SKIP)) return;
    const done = toSpanish(text);
    if (done !== text) node.nodeValue = value.replace(text, done);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  if (el.matches(SKIP)) return;
  for (const name of ATTRIBUTES) {
    const value = el.getAttribute(name);
    if (value) {
      const done = toSpanish(value);
      if (done !== value) el.setAttribute(name, done);
    }
  }
  el.childNodes.forEach(translateNode);
}

// Runs before the browser paints; the stylesheet hides the panel until the first pass is done.
export function PanelTranslator({ lang }: { lang: string }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (lang !== 'es') {
      root.dataset.adminReady = 'true';
      return;
    }
    translateNode(document.body);
    root.dataset.adminReady = 'true';
    const observer = new MutationObserver((changes) => {
      for (const change of changes) {
        if (change.type === 'characterData' || change.type === 'attributes') translateNode(change.target);
        else change.addedNodes.forEach(translateNode);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES });
    return () => observer.disconnect();
  }, [lang]);
  return null;
}

const YEAR = 60 * 60 * 24 * 365;

export function PanelPreferences({ lang, theme }: { lang: string; theme: string }) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  return (
    <>
      <button
        className="admin-icon-btn admin-lang"
        type="button"
        aria-label="Change language"
        title="Change language"
        onClick={() => {
          document.cookie = `admin-lang=${lang === 'es' ? 'en' : 'es'}; path=/admin; max-age=${YEAR}; samesite=strict`;
          // A full reload brings back the original text to translate from.
          window.location.reload();
        }}
      >
        <span data-raw>{lang === 'es' ? 'EN' : 'ES'}</span>
      </button>
      <button
        className="admin-icon-btn"
        type="button"
        aria-label={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        onClick={() => {
          document.cookie = `admin-theme=${nextTheme}; path=/admin; max-age=${YEAR}; samesite=strict`;
          window.location.reload();
        }}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size="sm" />
      </button>
    </>
  );
}
