// Every email the store sends. Shared by the server, which sends them, and the panel, which previews them.
export type TemplateKey = 'welcome' | 'order_paid' | 'order_shipped' | 'order_out_for_delivery' | 'order_delivered' | 'order_refund' | 'order_team' | 'quote_team' | 'order_review';
export type EmailLocale = 'en' | 'es';
export type TemplateContent = { enabled: boolean; subject_en: string; body_en: string; subject_es: string; body_es: string };

export type TemplateDef = {
  key: TemplateKey;
  name: string;
  stage: string;
  when: string;
  audience: 'customer' | 'team';
  // Not sent yet because the feature behind it does not exist.
  pendingNote?: string;
  variables: Record<string, string>;
  sample: Record<string, string>;
  subject: Record<EmailLocale, string>;
  body: Record<EmailLocale, string>;
};

const ORDER_VARS = {
  order_ref: 'Short order reference',
  items: 'One line per product, with quantity and price',
  total: 'Order total, including tax',
  tax: 'Sales tax on the order',
  ship_to: 'Delivery address, several lines',
};
const SHIP_VARS = {
  order_ref: 'Short order reference',
  items: 'One line per product',
  carrier: 'Carrier name',
  tracking_number: 'Carrier tracking number, or a dash',
  track_url: 'Link to the AGROTIRES tracking page',
  location: 'Last reported location, or a dash',
};
const SAMPLE = {
  order_ref: 'A1B2C3D4',
  items: '2 x Rear Tractor Tire (SKU-001): $1,378.00',
  total: '$1,474.46',
  tax: '$96.46',
  ship_to: 'Ana Ruiz\n1 Farm Rd\nAmes, IA 50010\nUS',
  carrier: 'Freight carrier',
  tracking_number: 'PRO-123456',
  track_url: 'https://agrotiresusa.com/track?code=AG7K2M9QX4',
  location: 'Des Moines, IA',
  amount: '$250.00',
  refunded_total: '$250.00',
  name: 'Ana Ruiz',
  email: 'ana@example.com',
  phone: '555-0100',
  zip: '50301',
  topic: 'Freight shipping',
  product: 'Rear Tractor Tire',
  message: 'I need a freight quote for two tires.',
  language: 'es',
  admin_url: 'https://agrotiresusa.com/admin',
  customer_email: 'ana@example.com',
  detail: 'capture 8X2 is COMPLETED for 1.00 USD',
  store_url: 'https://agrotiresusa.com',
};
const pick = (vars: Record<string, string>) => Object.fromEntries(Object.keys(vars).map((k) => [k, SAMPLE[k as keyof typeof SAMPLE]]));
const def = (d: Omit<TemplateDef, 'sample'>): TemplateDef => ({ ...d, sample: pick(d.variables) });

export const EMAIL_TEMPLATES: TemplateDef[] = [
  def({
    key: 'welcome',
    name: 'Account created',
    stage: 'Account',
    when: 'A customer confirms their new account',
    audience: 'customer',
    variables: { name: 'Customer name', store_url: 'Link to the store' },
    subject: { en: 'Welcome to AGROTIRES', es: 'Te damos la bienvenida a AGROTIRES' },
    body: {
      en: 'Hello {{name}},\n\nYour AGROTIRES account is ready. You can follow your orders and keep your farm essentials in one place.\n\n{{store_url}}',
      es: 'Hola {{name}}:\n\nTu cuenta de AGROTIRES está lista. Puedes seguir tus pedidos y tener tus esenciales para el campo en un solo lugar.\n\n{{store_url}}',
    },
  }),
  def({
    key: 'order_paid',
    name: 'Payment received',
    stage: 'Purchase',
    when: 'PayPal confirms a payment',
    audience: 'customer',
    variables: ORDER_VARS,
    subject: { en: 'We received your payment: {{order_ref}}', es: 'Recibimos tu pago: {{order_ref}}' },
    body: {
      en: 'Thank you for your AGROTIRES order.\n\nOrder reference: {{order_ref}}\n{{items}}\nSales tax: {{tax}} USD\nTotal paid: {{total}} USD\n\nShip to:\n{{ship_to}}\n\nThe AGROTIRES team will contact you about delivery. You can reply to this email with any questions.',
      es: 'Gracias por tu compra en AGROTIRES.\n\nReferencia del pedido: {{order_ref}}\n{{items}}\nImpuesto de venta: {{tax}} USD\nTotal pagado: {{total}} USD\n\nEnviar a:\n{{ship_to}}\n\nEl equipo de AGROTIRES te contactará sobre la entrega. Puedes responder a este correo si tienes preguntas.',
    },
  }),
  def({
    key: 'order_shipped',
    name: 'Order dispatched',
    stage: 'Delivery',
    when: 'The team creates the shipment',
    audience: 'customer',
    variables: SHIP_VARS,
    subject: { en: 'Your order has been dispatched: {{order_ref}}', es: 'Tu pedido fue despachado: {{order_ref}}' },
    body: {
      en: 'Your AGROTIRES order has been dispatched.\n\nOrder reference: {{order_ref}}\n{{items}}\nCarrier: {{carrier}}\nTracking number: {{tracking_number}}\n\nFollow your shipment here:\n{{track_url}}\n\nYou can reply to this email with any questions.',
      es: 'Tu pedido de AGROTIRES fue despachado.\n\nReferencia del pedido: {{order_ref}}\n{{items}}\nTransportista: {{carrier}}\nNúmero de guía: {{tracking_number}}\n\nSigue tu envío aquí:\n{{track_url}}\n\nPuedes responder a este correo si tienes preguntas.',
    },
  }),
  def({
    key: 'order_out_for_delivery',
    name: 'Out for delivery',
    stage: 'Delivery',
    when: 'The team marks the shipment as out for delivery',
    audience: 'customer',
    variables: SHIP_VARS,
    subject: { en: 'Your order is out for delivery: {{order_ref}}', es: 'Tu pedido está en reparto: {{order_ref}}' },
    body: {
      en: 'Your AGROTIRES order {{order_ref}} is out for delivery.\n\nLast location: {{location}}\n\nFollow your shipment here:\n{{track_url}}',
      es: 'Tu pedido de AGROTIRES {{order_ref}} está en reparto.\n\nÚltima ubicación: {{location}}\n\nSigue tu envío aquí:\n{{track_url}}',
    },
  }),
  def({
    key: 'order_delivered',
    name: 'Order delivered',
    stage: 'Delivery',
    when: 'The team marks the shipment as delivered',
    audience: 'customer',
    variables: SHIP_VARS,
    subject: { en: 'Your order was delivered: {{order_ref}}', es: 'Tu pedido fue entregado: {{order_ref}}' },
    body: {
      en: 'Your AGROTIRES order {{order_ref}} was delivered.\n\nIf anything is missing or does not look right, reply to this email and we will help.\n\nThank you for choosing AGROTIRES.',
      es: 'Tu pedido de AGROTIRES {{order_ref}} fue entregado.\n\nSi falta algo o algo no está bien, responde a este correo y te ayudaremos.\n\nGracias por elegir AGROTIRES.',
    },
  }),
  def({
    key: 'order_refund',
    name: 'Refund issued',
    stage: 'After the sale',
    when: 'A refund is issued from the panel or in PayPal',
    audience: 'customer',
    variables: { order_ref: 'Short order reference', amount: 'Amount of this refund', refunded_total: 'Total refunded so far', total: 'Order total' },
    subject: { en: 'Refund for your order: {{order_ref}}', es: 'Reembolso de tu pedido: {{order_ref}}' },
    body: {
      en: 'We issued a refund for your AGROTIRES order through PayPal.\n\nOrder reference: {{order_ref}}\nAmount refunded: {{amount}} USD\nTotal refunded on this order: {{refunded_total}} of {{total}} USD\n\nPayPal will let you know when the money is available. You can reply to this email with any questions.',
      es: 'Hicimos un reembolso de tu pedido en AGROTIRES a través de PayPal.\n\nReferencia del pedido: {{order_ref}}\nMonto reembolsado: {{amount}} USD\nTotal reembolsado del pedido: {{refunded_total}} de {{total}} USD\n\nPayPal te avisará cuando el dinero esté disponible. Puedes responder a este correo si tienes preguntas.',
    },
  }),
  def({
    key: 'order_team',
    name: 'New paid order',
    stage: 'Team alerts',
    when: 'PayPal confirms a payment',
    audience: 'team',
    variables: { order_ref: 'Short order reference', total: 'Order total', customer_email: 'Customer email', items: 'One line per product', ship_to: 'Delivery address', admin_url: 'Link to the order in the panel' },
    subject: { en: 'New paid order {{order_ref}}: {{total}}', es: 'New paid order {{order_ref}}: {{total}}' },
    body: {
      en: 'Customer: {{customer_email}}\n{{items}}\nTotal: {{total}} USD\n\nShip to:\n{{ship_to}}\n\nPanel: {{admin_url}}',
      es: 'Customer: {{customer_email}}\n{{items}}\nTotal: {{total}} USD\n\nShip to:\n{{ship_to}}\n\nPanel: {{admin_url}}',
    },
  }),
  def({
    key: 'quote_team',
    name: 'New quote request',
    stage: 'Team alerts',
    when: 'A customer sends the quote form',
    audience: 'team',
    variables: { name: 'Customer name', email: 'Customer email', phone: 'Phone, or a dash', zip: 'Delivery ZIP, or a dash', topic: 'Inquiry type', product: 'Product, or a dash', language: 'Language used', message: 'What the customer wrote', admin_url: 'Link to the request in the panel' },
    subject: { en: 'New quote request: {{topic}}', es: 'New quote request: {{topic}}' },
    body: {
      en: 'Name: {{name}}\nEmail: {{email}}\nPhone: {{phone}}\nDelivery ZIP: {{zip}}\nTopic: {{topic}}\nProduct: {{product}}\nLanguage: {{language}}\n\n{{message}}\n\nReply to this email to answer the customer. Panel: {{admin_url}}',
      es: 'Name: {{name}}\nEmail: {{email}}\nPhone: {{phone}}\nDelivery ZIP: {{zip}}\nTopic: {{topic}}\nProduct: {{product}}\nLanguage: {{language}}\n\n{{message}}\n\nReply to this email to answer the customer. Panel: {{admin_url}}',
    },
  }),
  def({
    key: 'order_review',
    name: 'Payment needs review',
    stage: 'Team alerts',
    when: 'PayPal reports something that does not match an order',
    audience: 'team',
    variables: { order_ref: 'Short order reference', detail: 'What PayPal reported', admin_url: 'Link to the order in the panel' },
    subject: { en: 'Order {{order_ref}} needs review', es: 'Order {{order_ref}} needs review' },
    body: {
      en: 'PayPal reported something that does not match this order: {{detail}}.\nCheck PayPal before contacting the customer.\n\nPanel: {{admin_url}}',
      es: 'PayPal reported something that does not match this order: {{detail}}.\nCheck PayPal before contacting the customer.\n\nPanel: {{admin_url}}',
    },
  }),
];

export const templateDef = (key: string) => EMAIL_TEMPLATES.find((t) => t.key === key);

export const defaultContent = (d: TemplateDef): TemplateContent => ({ enabled: true, subject_en: d.subject.en, body_en: d.body.en, subject_es: d.subject.es, body_es: d.body.es });

// A single pass, so text a customer typed can never be read as another {{variable}}.
export const fillTemplate = (text: string, vars: Record<string, string>) => text.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, name: string) => vars[name] ?? whole);

const usedVariables = (text: string) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]);

// Returns what is wrong with the content, so nothing broken can reach a customer.
export function templateProblem(d: TemplateDef, c: Omit<TemplateContent, 'enabled'>): string | undefined {
  const languages: EmailLocale[] = d.audience === 'team' ? ['en'] : ['en', 'es'];
  for (const lang of languages) {
    const label = lang === 'en' ? 'English' : 'Spanish';
    const subject = c[`subject_${lang}`];
    const body = c[`body_${lang}`];
    if (!subject.trim()) return `The ${label} subject is empty.`;
    if (!body.trim()) return `The ${label} message is empty.`;
    if (/[\r\n]/.test(subject)) return `The ${label} subject must be one line.`;
    if (subject.length > 200) return `The ${label} subject is too long.`;
    if (body.length > 10_000) return `The ${label} message is too long.`;
    const unknown = usedVariables(subject + body).find((v) => !(v in d.variables));
    if (unknown) return `{{${unknown}}} is not available in this email.`;
  }
  return undefined;
}
