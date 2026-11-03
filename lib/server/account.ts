import type { Locale } from '../i18n';
import { notifyWelcome } from './email';
import { getStore } from './store';

// After the address is confirmed, so the form cannot be used to email strangers.
export async function greetOnce(user: { id: string; email?: string; email_confirmed_at?: string; user_metadata?: { full_name?: string } }, locale: Locale) {
  if (!user.email || !user.email_confirmed_at) return;
  try {
    const store = getStore();
    if (store && (await store.markWelcomed(user.id))) await notifyWelcome(user.email, user.user_metadata?.full_name ?? '', locale);
  } catch (e) {
    console.error('Could not send the welcome email', e);
  }
}
