import nodemailer from 'nodemailer';
import { BUSINESS, money } from '../catalog';
import type { Order, Quote } from './store';

// Sends through the Google Workspace mailbox, so no DNS record has to change. Plain text only,
// which also keeps anything a customer typed from becoming markup in someone's inbox.
type Mail = { to: string; subject: string; text: string; replyTo?: string };

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || `https://${BUSINESS.domain}`).replace(/\/$/, '');
const teamEmail = () => process.env.EMAIL_TEAM || BUSINESS.contactEmail;
// Sandbox payments must not read like real sales to the customer or the team.
const testPrefix = () => (process.env.PAYPAL_ENV === 'live' ? '' : '[TEST] ');
export const orderRef = (id: string) => id.slice(0, 8).toUpperCase();

export function emailEnabled() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

// Never throws: the quote or the payment is already saved, and a mail problem must not undo that.
// Awaited by the callers because a serverless function can stop as soon as it answers.
async function send(mails: Mail[]) {
  if (!emailEnabled()) return;
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
  const results = await Promise.allSettled(mails.map((mail) => transport.sendMail({ from, ...mail })));
  transport.close();
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`Email failed: ${mails[i].subject}`, r.reason);
  });
}

const itemLines = (order: Order) => order.items.map((i) => `${i.quantity} x ${i.name} (${i.sku}): ${money((i.unitPriceCents * i.quantity) / 100)}`);
const addressLines = (order: Order) => {
  const a = order.shippingAddress;
  return a ? [a.name, a.line1, a.line2, `${a.city}, ${a.state} ${a.postalCode}`, a.country].filter((l): l is string => Boolean(l)) : [];
};

export function quoteTeamMail(q: Quote): Mail {
  return {
    to: teamEmail(),
    replyTo: q.email,
    subject: `New quote request: ${q.topic}`,
    text: [
      `Name: ${q.name}`,
      `Email: ${q.email}`,
      `Phone: ${q.phone || '-'}`,
      `Delivery ZIP: ${q.deliveryZip || '-'}`,
      `Topic: ${q.topic}`,
      `Product: ${q.product || '-'}`,
      `Language: ${q.locale ?? 'en'}`,
      '',
      q.message,
      '',
      `Reply to this email to answer the customer. Panel: ${siteUrl()}/admin/quotes/${q.id}`,
    ].join('\n'),
  };
}

export function orderCustomerMail(order: Order): Mail {
  const es = order.locale === 'es';
  const ref = orderRef(order.id);
  const address = addressLines(order);
  return {
    to: order.email,
    replyTo: teamEmail(),
    subject: `${testPrefix()}${es ? 'Recibimos tu pago' : 'We received your payment'}: ${ref}`,
    text: [
      es ? 'Gracias por tu compra en AGROTIRES.' : 'Thank you for your AGROTIRES order.',
      '',
      `${es ? 'Referencia del pedido' : 'Order reference'}: ${ref}`,
      ...itemLines(order),
      `${es ? 'Total pagado' : 'Total paid'}: ${money(order.totalCents / 100)} USD`,
      ...(address.length ? ['', es ? 'Enviar a:' : 'Ship to:', ...address] : []),
      '',
      es ? 'El equipo de AGROTIRES te contactará sobre la entrega. Puedes responder a este correo si tienes preguntas.' : 'The AGROTIRES team will contact you about delivery. You can reply to this email with any questions.',
    ].join('\n'),
  };
}

export function orderTeamMail(order: Order): Mail {
  return {
    to: teamEmail(),
    replyTo: order.email,
    subject: `${testPrefix()}New paid order ${orderRef(order.id)}: ${money(order.totalCents / 100)}`,
    text: [
      `Customer: ${order.email}`,
      ...itemLines(order),
      `Total: ${money(order.totalCents / 100)} USD`,
      '',
      'Ship to:',
      ...(addressLines(order).length ? addressLines(order) : ['Not provided by PayPal']),
      '',
      `Panel: ${siteUrl()}/admin/orders/${order.id}`,
    ].join('\n'),
  };
}

export function orderReviewMail(order: Order, detail: string): Mail {
  return {
    to: teamEmail(),
    subject: `${testPrefix()}Order ${orderRef(order.id)} needs review`,
    text: [`PayPal reported something that does not match this order: ${detail}.`, 'Check PayPal before contacting the customer.', '', `Panel: ${siteUrl()}/admin/orders/${order.id}`].join('\n'),
  };
}

export function orderShippedMail(order: Order): Mail {
  const es = order.locale === 'es';
  const ref = orderRef(order.id);
  const address = addressLines(order);
  return {
    to: order.email,
    replyTo: teamEmail(),
    subject: `${testPrefix()}${es ? 'Tu pedido fue despachado' : 'Your order has been dispatched'}: ${ref}`,
    text: [
      es ? 'Tu pedido de AGROTIRES fue despachado.' : 'Your AGROTIRES order has been dispatched.',
      '',
      `${es ? 'Referencia del pedido' : 'Order reference'}: ${ref}`,
      ...itemLines(order),
      ...(address.length ? ['', es ? 'Enviar a:' : 'Ship to:', ...address] : []),
      '',
      es ? 'Puedes responder a este correo si tienes preguntas.' : 'You can reply to this email with any questions.',
    ].join('\n'),
  };
}

export function orderRefundMail(order: Order, cents: number): Mail {
  const es = order.locale === 'es';
  const ref = orderRef(order.id);
  const total = money(order.totalCents / 100);
  const refunded = money((order.refundedCents ?? 0) / 100);
  return {
    to: order.email,
    replyTo: teamEmail(),
    subject: `${testPrefix()}${es ? 'Reembolso de tu pedido' : 'Refund for your order'}: ${ref}`,
    text: [
      es ? 'Hicimos un reembolso de tu pedido en AGROTIRES a través de PayPal.' : 'We issued a refund for your AGROTIRES order through PayPal.',
      '',
      `${es ? 'Referencia del pedido' : 'Order reference'}: ${ref}`,
      `${es ? 'Monto reembolsado' : 'Amount refunded'}: ${money(cents / 100)} USD`,
      `${es ? 'Total reembolsado del pedido' : 'Total refunded on this order'}: ${refunded} ${es ? 'de' : 'of'} ${total} USD`,
      '',
      es ? 'PayPal te avisará cuando el dinero esté disponible. Puedes responder a este correo si tienes preguntas.' : 'PayPal will let you know when the money is available. You can reply to this email with any questions.',
    ].join('\n'),
  };
}

export const notifyQuote = (q: Quote) => send([quoteTeamMail(q)]);
export const notifyPaid = (order: Order) => send([orderCustomerMail(order), orderTeamMail(order)]);
export const notifyShipped = (order: Order) => send([orderShippedMail(order)]);
export const notifyRefund = (order: Order, cents: number) => send([orderRefundMail(order, cents)]);
export const notifyReview = (order: Order, detail: string) => send([orderReviewMail(order, detail)]);
