import { notFound } from 'next/navigation';
import { LOCALES, isLocale, type Locale } from './i18n';
import { messages } from './messages';

export type LocaleParams = { params: Promise<{ locale: string }> };

export const localeStaticParams = () => LOCALES.map((locale) => ({ locale }));

export async function resolveLocale({ params }: LocaleParams): Promise<{ locale: Locale; t: (typeof messages)['en'] }> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { locale, t: messages[locale] };
}
