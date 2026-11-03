import nodemailer from 'nodemailer';
import { BUSINESS, money } from '../catalog';
import { defaultContent, fillTemplate, templateDef, type EmailLocale, type TemplateContent, type TemplateKey } from '../email-templates';
import { sign } from './signed';
import { getStore, type B2bAccount, type Order, type Quote, type Shipment } from './store';

// Sends through the Google Workspace mailbox, so no DNS record has to change.
export type Mail = { to: string; subject: string; text: string; html?: string; replyTo?: string; headers?: Record<string, string> };
export type CommercialKey = 'cart_reminder' | 'reorder_reminder' | 'review_request';

export const publicSite = () => siteUrl();
const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || `https://${BUSINESS.domain}`).replace(/\/$/, '');
const teamEmail = () => process.env.EMAIL_TEAM || BUSINESS.contactEmail;
// Sandbox payments must not read like real sales to the customer or the team.
const testPrefix = () => (process.env.PAYPAL_ENV === 'live' ? '' : '[TEST] ');
export const orderRef = (id: string) => id.slice(0, 8).toUpperCase();

export function emailEnabled() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Everything is escaped first, so anything a customer typed stays plain text in someone's inbox.
export function brandedHtml(text: string) {
  const body = escapeHtml(text)
    .replace(/https:\/\/[^\s<]+/g, (url) => `<a href="${url}" style="color:#0a6b4f">${url}</a>`)
    .replace(/\n/g, '<br>');
  return `<div style="background:#f4f6f2;padding:24px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e1e8e1"><div style="background:#0b4a3b;color:#fff;padding:16px 22px;font-weight:bold;letter-spacing:.02em">AGROTIRES <span style="font-weight:normal;font-size:12px;opacity:.8">INSTANT SOLUTION</span></div><div style="padding:22px;font-size:14px;line-height:1.55;color:#1d2b25">${body}</div></div></div>`;
}

// Never throws: the quote or the payment is already saved, and a mail problem must not undo that.
// Awaited by the callers because a serverless function can stop as soon as it answers.
export async function send(mails: Mail[]) {
  if (!emailEnabled() || !mails.length) return { sent: 0, failed: 0 };
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });
  const from = { name: BUSINESS.name, address: process.env.EMAIL_FROM || BUSINESS.contactEmail };
  const results = await Promise.allSettled(mails.map((mail) => transport.sendMail({ from, html: brandedHtml(mail.text), ...mail })));
  transport.close();
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`Email failed: ${mails[i].subject}`, r.reason);
  });
  return { sent: results.filter((r) => r.status === 'fulfilled').length, failed: results.filter((r) => r.status === 'rejected').length };
}

const itemLines = (order: Order) => order.items.map((i) => `${i.quantity} x ${i.name} (${i.sku}): ${money((i.unitPriceCents * i.quantity) / 100)}`).join('\n');
const addressLines = (order: Order) => {
  const a = order.shippingAddress;
  return a ? [a.name, a.line1, a.line2, `${a.city}, ${a.state} ${a.postalCode}`, a.country].filter(Boolean).join('\n') : '-';
};
const usd = (cents: number) => money(cents / 100);
const orderUrl = (id: string) => `${siteUrl()}/admin/orders/${id}`;
const trackUrl = (order: Order, code: string) => `${siteUrl()}${order.locale === 'es' ? '/es' : ''}/track?code=${code}`;

// Builds one email from its template; content is the saved version, or the default without one.
function build(key: TemplateKey, lang: EmailLocale, to: string, vars: Record<string, string>, content?: TemplateContent, replyTo?: string): Mail {
  const def = templateDef(key)!;
  const c = content ?? defaultContent(def);
  const prefix = key === 'quote_team' ? '' : testPrefix();
  return { to, replyTo, subject: prefix + fillTemplate(c[`subject_${lang}`], vars).replace(/[\r\n]+/g, ' '), text: fillTemplate(c[`body_${lang}`], vars) };
}

const locale = (order: Order): EmailLocale => (order.locale === 'es' ? 'es' : 'en');
const orderVars = (order: Order) => ({ order_ref: orderRef(order.id), items: itemLines(order), total: usd(order.totalCents), tax: usd(order.taxCents), ship_to: addressLines(order) });

export const quoteTeamMail = (q: Quote, c?: TemplateContent) => build('quote_team', 'en', teamEmail(), {
  name: q.name, email: q.email, phone: q.phone || '-', zip: q.deliveryZip || '-', topic: q.topic, product: q.product || '-', language: q.locale ?? 'en', message: q.message, admin_url: `${siteUrl()}/admin/quotes/${q.id}`,
}, c, q.email);

export const orderCustomerMail = (order: Order, c?: TemplateContent) => build('order_paid', locale(order), order.email, orderVars(order), c, teamEmail());

export const orderTeamMail = (order: Order, c?: TemplateContent) => build('order_team', 'en', teamEmail(), {
  order_ref: orderRef(order.id), total: usd(order.totalCents), customer_email: order.email, items: itemLines(order), ship_to: addressLines(order), admin_url: orderUrl(order.id),
}, c, order.email);

export const orderReviewMail = (order: Order, detail: string, c?: TemplateContent) => build('order_review', 'en', teamEmail(), { order_ref: orderRef(order.id), detail, admin_url: orderUrl(order.id) }, c);

export const orderRefundMail = (order: Order, cents: number, c?: TemplateContent) => build('order_refund', locale(order), order.email, {
  order_ref: orderRef(order.id), amount: usd(cents), refunded_total: usd(order.refundedCents ?? 0), total: usd(order.totalCents),
}, c, teamEmail());

export type ShipmentMailKey = 'order_shipped' | 'order_out_for_delivery' | 'order_delivered';

export const shipmentMail = (key: ShipmentMailKey, order: Order, shipment: Shipment, c?: TemplateContent) => build(key, locale(order), order.email, {
  order_ref: orderRef(order.id),
  items: itemLines(order),
  carrier: shipment.carrier,
  tracking_number: shipment.trackingNumber || '-',
  track_url: trackUrl(order, shipment.code),
  location: shipment.events.slice().reverse().find((e) => e.location)?.location || '-',
}, c, teamEmail());

// An unreadable or missing saved version must never stop an email: the default goes out instead.
async function contentFor(key: TemplateKey) {
  try {
    return (await getStore()?.listEmailTemplates())?.find((t) => t.key === key);
  } catch (e) {
    console.error('Could not read email templates', e);
    return undefined;
  }
}

async function deliver(key: TemplateKey, make: (c?: TemplateContent) => Mail) {
  if (!emailEnabled()) return;
  const content = await contentFor(key);
  if (content && !content.enabled) return;
  await send([make(content)]);
}

const langOf = (l: string | undefined): EmailLocale => (l === 'es' ? 'es' : 'en');

// Promotional messages always carry the opt out and the postal address the law requires,
// added here so an edit of the template cannot remove them.
export const notifyCommercial = (key: CommercialKey, to: string, locale: string | undefined, vars: Record<string, string>) => deliver(key, (c) => {
  const lang = langOf(locale);
  const query = `e=${encodeURIComponent(to)}&s=${sign('unsubscribe', to.toLowerCase())}`;
  const mail = build(key, lang, to, vars, c, teamEmail());
  const footer = lang === 'es' ? 'Si no quieres recibir estos mensajes, date de baja aquí:' : 'To stop receiving these messages, unsubscribe here:';
  return {
    ...mail,
    text: `${mail.text}\n\n--\n${footer}\n${siteUrl()}${lang === 'es' ? '/es' : ''}/unsubscribe?${query}\n\nAGROTIRES, ${process.env.BUSINESS_POSTAL_ADDRESS ?? ''}`,
    headers: { 'List-Unsubscribe': `<${siteUrl()}/api/unsubscribe?${query}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
});

export const notifyPayLink = (order: Order) => deliver('quote_payment_link', (c) => build('quote_payment_link', locale(order), order.email, { ...orderVars(order), pay_url: `${siteUrl()}${order.locale === 'es' ? '/es' : ''}/pay/${order.payToken}` }, c, teamEmail()));

export const notifyTerms = (order: Order, account: B2bAccount) => {
  const due = new Date(order.invoiceDueAt!).toLocaleDateString(order.locale === 'es' ? 'es-US' : 'en-US', { dateStyle: 'long' });
  return Promise.all([
    deliver('order_terms', (c) => build('order_terms', locale(order), order.email, { ...orderVars(order), due_date: due, terms_days: String(account.termsDays) }, c, teamEmail())),
    deliver('terms_team', (c) => build('terms_team', 'en', teamEmail(), { order_ref: orderRef(order.id), total: usd(order.totalCents), company: account.company, due_date: due, admin_url: orderUrl(order.id) }, c, order.email)),
  ]);
};

export const notifyB2bApproved = (account: B2bAccount, lang: EmailLocale) => deliver('b2b_approved', (c) => build('b2b_approved', lang, account.email, { company: account.company, discount: `${account.discountBps / 100}%`, terms_days: String(account.termsDays) }, c, teamEmail()));

export const notifyWelcome = (to: string, name: string, lang: EmailLocale) => deliver('welcome', (c) => build('welcome', lang, to, { name: name || to, store_url: siteUrl() + (lang === 'es' ? '/es' : '') }, c, teamEmail()));
export const notifyQuote = (q: Quote) => deliver('quote_team', (c) => quoteTeamMail(q, c));
export const notifyPaid = (order: Order) => Promise.all([deliver('order_paid', (c) => orderCustomerMail(order, c)), deliver('order_team', (c) => orderTeamMail(order, c))]);
export const notifyRefund = (order: Order, cents: number) => deliver('order_refund', (c) => orderRefundMail(order, cents, c));
export const notifyReview = (order: Order, detail: string) => deliver('order_review', (c) => orderReviewMail(order, detail, c));
export const notifyShipment = (key: ShipmentMailKey, order: Order, shipment: Shipment) => deliver(key, (c) => shipmentMail(key, order, shipment, c));
