'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isUsState } from '@/lib/tax';
import { localePath, type Locale } from '@/lib/i18n';
import { greetOnce } from '@/lib/server/account';
import { supabaseAuthClient } from '@/lib/server/admin-auth';
import { getCustomer } from '@/lib/server/customer';
import { rateLimited } from '@/lib/server/http';
import { getStore } from '@/lib/server/store';

// Codes the page turns into text in the visitor's language.
export type AccountState = { error?: 'invalid' | 'credentials' | 'busy' | 'weak' | 'failed' | 'mismatch'; notice?: 'check_email' | 'reset_sent' | 'password_changed' | 'address_saved' | 'machine_saved' };

const ip = async () => (await headers()).get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
const site = async () => {
  const h = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
};
const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim();
const emailSchema = z.string().email().max(200);
const MIN_PASSWORD = 10;

export async function signInAction(locale: Locale, _: AccountState, form: FormData): Promise<AccountState> {
  if (await rateLimited(`customer-login:${await ip()}`, 8, 15 * 60_000)) return { error: 'busy' };
  const client = await supabaseAuthClient();
  const { data, error } = await client.auth.signInWithPassword({ email: text(form, 'email'), password: String(form.get('password') ?? '') });
  // Same answer for a wrong password and an unknown email.
  if (error || !data.user) return { error: 'credentials' };
  await greetOnce(data.user, locale);
  redirect(localePath(locale, '/account'));
}

export async function signUpAction(locale: Locale, _: AccountState, form: FormData): Promise<AccountState> {
  if (await rateLimited(`customer-signup:${await ip()}`, 5, 60 * 60_000)) return { error: 'busy' };
  const email = text(form, 'email');
  const password = String(form.get('password') ?? '');
  const name = text(form, 'name').slice(0, 120);
  if (!emailSchema.safeParse(email).success || !name) return { error: 'invalid' };
  if (password.length < MIN_PASSWORD) return { error: 'weak' };
  const client = await supabaseAuthClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: name }, emailRedirectTo: `${await site()}/auth/callback?next=${localePath(locale, '/account')}` },
  });
  if (error) {
    console.error('Sign up failed', error.message);
    return { error: 'failed' };
  }
  if (data.session && data.user) {
    await greetOnce(data.user, locale);
    redirect(localePath(locale, '/account'));
  }
  // Also the answer for an address already registered, which must not be revealed.
  return { notice: 'check_email' };
}

export async function forgotPasswordAction(locale: Locale, _: AccountState, form: FormData): Promise<AccountState> {
  if (await rateLimited(`customer-reset:${await ip()}`, 5, 60 * 60_000)) return { error: 'busy' };
  const email = text(form, 'email');
  if (!emailSchema.safeParse(email).success) return { error: 'invalid' };
  const client = await supabaseAuthClient();
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${await site()}/auth/callback?next=${localePath(locale, '/account/password')}` });
  if (error) console.error('Password reset failed', error.message);
  // The same answer whether or not the address has an account.
  return { notice: 'reset_sent' };
}

export async function changePasswordAction(_: AccountState, form: FormData): Promise<AccountState> {
  const password = String(form.get('password') ?? '');
  if (password.length < MIN_PASSWORD) return { error: 'weak' };
  if (password !== String(form.get('confirm') ?? '')) return { error: 'mismatch' };
  if (!(await getCustomer())) return { error: 'failed' };
  const client = await supabaseAuthClient();
  const { error } = await client.auth.updateUser({ password });
  if (error) {
    console.error('Password change failed', error.message);
    return { error: 'failed' };
  }
  return { notice: 'password_changed' };
}

export async function signOutAction(locale: Locale) {
  const client = await supabaseAuthClient();
  await client.auth.signOut();
  redirect(localePath(locale, '/account'));
}

const addressSchema = z.object({
  recipient: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200),
  city: z.string().trim().min(1).max(120),
  state: z.string().refine(isUsState),
  postalCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/),
  phone: z.string().trim().max(40),
});

// The profile always comes from the session, never from the form.
export async function saveAddressAction(locale: Locale, _: AccountState, form: FormData): Promise<AccountState> {
  const customer = await getCustomer();
  const store = getStore();
  if (!customer || !store) return { error: 'failed' };
  const parsed = addressSchema.safeParse(Object.fromEntries(['recipient', 'line1', 'line2', 'city', 'state', 'postalCode', 'phone'].map((k) => [k, text(form, k)])));
  if (!parsed.success) return { error: 'invalid' };
  if ((await store.listAddresses(customer.id)).length >= 20) return { error: 'invalid' };
  await store.saveAddress(customer.id, { ...parsed.data, line2: parsed.data.line2 || undefined, phone: parsed.data.phone || undefined });
  revalidatePath(localePath(locale, '/account'));
  return { notice: 'address_saved' };
}

export async function applyB2bAction(locale: Locale, _: AccountState, form: FormData): Promise<AccountState> {
  const customer = await getCustomer();
  const store = getStore();
  if (!customer || !store) return { error: 'failed' };
  const company = text(form, 'company').slice(0, 160);
  if (!company) return { error: 'invalid' };
  const existing = await store.getB2bAccount(customer.id);
  // Asking again never changes prices or terms the team already set.
  if (existing?.status === 'approved') return { error: 'invalid' };
  await store.saveB2bAccount({ profileId: customer.id, email: customer.email, company, taxId: text(form, 'taxId').slice(0, 60) || undefined, note: text(form, 'note').slice(0, 1000) || undefined, status: 'pending', discountBps: 0, termsDays: 0, createdAt: new Date().toISOString(), locale });
  revalidatePath(localePath(locale, '/account'));
  return { notice: 'address_saved' };
}

export async function saveMachineAction(locale: Locale, _: AccountState, form: FormData): Promise<AccountState> {
  const customer = await getCustomer();
  const store = getStore();
  if (!customer || !store) return { error: 'failed' };
  const make = text(form, 'make').slice(0, 80);
  const model = text(form, 'model').slice(0, 80);
  const yearText = text(form, 'year');
  const year = yearText ? Number(yearText) : undefined;
  if (!make || !model || (year !== undefined && (!Number.isInteger(year) || year < 1900 || year > 2100))) return { error: 'invalid' };
  if ((await store.listMachines(customer.id)).length >= 20) return { error: 'invalid' };
  await store.saveMachine(customer.id, { make, model, year });
  revalidatePath(localePath(locale, '/account'));
  return { notice: 'machine_saved' };
}

export async function deleteMachineAction(locale: Locale, id: string) {
  const customer = await getCustomer();
  if (!customer) return;
  await getStore()?.deleteMachine(customer.id, id);
  revalidatePath(localePath(locale, '/account'));
}

export async function deleteAddressAction(locale: Locale, id: string) {
  const customer = await getCustomer();
  if (!customer) return;
  await getStore()?.deleteAddress(customer.id, id);
  revalidatePath(localePath(locale, '/account'));
}
