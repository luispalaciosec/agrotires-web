// The admin library. Variable names may appear here; their values never do.
export type DocLang = 'es' | 'en';
type Section = [heading: string, items: string[]];
type Copy = { title: string; summary: string; sections: Section[] };
export type AdminDoc = { slug: string; group: string; es: Copy; en: Copy };

export const DOC_GROUPS: Record<string, Record<DocLang, string>> = {
  start: { es: 'Empezar', en: 'Start' },
  sell: { es: 'Vender', en: 'Sell' },
  catalog: { es: 'Catálogo y contenido', en: 'Catalog and content' },
  insight: { es: 'Análisis', en: 'Insight' },
  setup: { es: 'Ajustes', en: 'Setup' },
  tech: { es: 'Técnica y lanzamiento', en: 'Technical and launch' },
};

export const ADMIN_DOCS: AdminDoc[] = [
  {
    slug: 'primeros-pasos',
    group: 'start',
    es: { title: 'Primeros pasos', summary: 'Cómo está organizado el panel y qué hace cada botón de la barra superior.', sections: [
      ['Barra superior', ['Buscador: encuentra pedidos, productos, cotizaciones y envíos.', 'ES/EN: cambia el idioma del panel. El español es el predeterminado.', 'Sol o luna: cambia entre tema claro y oscuro.', 'Campana: muestra lo que requiere atención.', 'Sobre: lleva a las cotizaciones.']],
      ['Menú lateral', ['Ventas: panel, pedidos, envíos, cotizaciones, clientes, devoluciones y reseñas.', 'Catálogo: productos e inventario.', 'Contenido: páginas hechas con bloques.', 'Análisis: analítica, contabilidad y actividad.', 'Ajustes: tarifas de envío, impuestos, correos, equipo y esta biblioteca.']],
      ['Tema e idioma', ['Cada navegador recuerda su propia elección.', 'La traducción al español se aplica en el navegador sobre los textos del panel. Los datos escritos por clientes y por el equipo no se traducen.']],
    ] },
    en: { title: 'Getting started', summary: 'How the panel is organized and what each top bar button does.', sections: [
      ['Top bar', ['Search: finds orders, products, quotes and shipments.', 'ES/EN: changes the panel language. Spanish is the default.', 'Sun or moon: switches between light and dark theme.', 'Bell: shows what needs attention.', 'Envelope: goes to quote requests.']],
      ['Side menu', ['Sell: dashboard, orders, shipments, quotes, customers, returns and reviews.', 'Catalog: products and inventory.', 'Content: pages built from blocks.', 'Insight: analytics, accounting and activity.', 'Setup: shipping rates, taxes, emails, team and this library.']],
      ['Theme and language', ['Each browser remembers its own choice.', 'Spanish is applied in the browser over the panel text. Data written by customers and the team is not translated.']],
    ] },
  },
  {
    slug: 'pedidos',
    group: 'sell',
    es: { title: 'Pedidos y reembolsos', summary: 'Ver pedidos, filtrarlos, exportarlos y devolver dinero por PayPal.', sections: [
      ['Lista', ['Filtra por estado y busca por referencia o correo.', 'Exportar CSV es solo para administradores.']],
      ['Reembolsos', ['Solo un administrador puede hacerlos, y requieren PayPal conectado.', 'Pueden ser parciales. Reintentar con el mismo monto no paga dos veces.', 'En el mismo formulario se indica cuántas unidades de cada producto vuelven al inventario, sin superar lo comprado.']],
      ['Protecciones', ['Un pago que llega varias veces a la vez se aplica una sola vez.', 'Un pedido cancelado no pasa a pagado: si el dinero entra igual, se avisa al equipo para revisarlo.']],
    ] },
    en: { title: 'Orders and refunds', summary: 'See orders, filter them, export them and return money through PayPal.', sections: [
      ['List', ['Filter by status and search by reference or email.', 'Export CSV is for administrators only.']],
      ['Refunds', ['Only an administrator can issue them, and PayPal must be connected.', 'They can be partial. Retrying with the same amount does not pay twice.', 'The same form says how many units of each product return to stock, up to what was bought.']],
      ['Safeguards', ['A payment arriving several times at once is applied only once.', 'A cancelled order does not become paid: if money arrives anyway, the team is alerted to review it.']],
    ] },
  },
  {
    slug: 'envios',
    group: 'sell',
    es: { title: 'Envíos y seguimiento', summary: 'Crear la guía y mantener informado al cliente.', sections: [
      ['Crear', ['Se crea desde un pedido pagado o a crédito, con transportista y número de guía.', 'Cada envío tiene una página de seguimiento para el cliente.']],
      ['Actualizar', ['Estados: guía creada, recogido, en tránsito, en reparto, entregado y problema reportado.', 'Se puede indicar la ubicación y una nota visible para el cliente, y avisarle por correo.']],
      ['Importante', ['El seguimiento lo actualiza el equipo a mano; no está conectado a las APIs de los transportistas.']],
    ] },
    en: { title: 'Shipments and tracking', summary: 'Create the tracking record and keep the customer informed.', sections: [
      ['Create', ['Created from a paid or on-terms order, with carrier and tracking number.', 'Each shipment has a tracking page for the customer.']],
      ['Update', ['Statuses: label created, picked up, in transit, out for delivery, delivered and problem reported.', 'You can add the location and a note the customer sees, and email them.']],
      ['Important', ['The team updates tracking by hand; it is not connected to carrier APIs.']],
    ] },
  },
  {
    slug: 'cotizaciones',
    group: 'sell',
    es: { title: 'Cotizaciones y enlaces de pago', summary: 'De una solicitud del cliente a un cobro con precio acordado.', sections: [
      ['Flujo', ['El cliente envía el formulario de cotización y el equipo recibe el aviso.', 'Marca cada solicitud en proceso, respondida o cerrada.']],
      ['Enlace de pago', ['Solo un administrador puede crearlo.', 'Se escriben las líneas, el flete y la dirección de entrega. El impuesto se calcula según esa dirección.', 'El enlace vale 14 días y se envía por correo si el correo está conectado.']],
    ] },
    en: { title: 'Quotes and payment links', summary: 'From a customer request to a payment at an agreed price.', sections: [
      ['Flow', ['The customer sends the quote form and the team is alerted.', 'Mark each request in progress, answered or closed.']],
      ['Payment link', ['Only an administrator can create one.', 'Enter the lines, freight and delivery address. Tax is calculated for that address.', 'The link lasts 14 days and is emailed if email is connected.']],
    ] },
  },
  {
    slug: 'clientes',
    group: 'sell',
    es: { title: 'Clientes, empresas y boletín', summary: 'Compradores, cuentas de empresa y suscriptores.', sections: [
      ['Cuentas de empresa', ['El cliente lo solicita desde su cuenta. Un administrador aprueba o rechaza.', 'Se define un descuento de 0 a 20 % y de 0 a 180 días para pagar.', 'El correo de aprobación sale en el idioma en que el cliente hizo la solicitud.']],
      ['Cuenta del cliente', ['Pedidos, direcciones, volver a comprar, favoritos y máquinas guardadas.', 'Una máquina guardada enlaza a la búsqueda de piezas compatibles.']],
      ['Boletín', ['El pie de página guarda las suscripciones. El panel descarga la lista en CSV, sin quienes se dieron de baja.', 'La tienda no envía campañas.', 'Hoy no hay confirmación por correo, así que una dirección puede estar escrita por otra persona: confírmala antes de usarla en campañas.', 'Quien se dio de baja no vuelve a la lista aunque alguien lo inscriba.']],
    ] },
    en: { title: 'Customers, businesses and newsletter', summary: 'Buyers, business accounts and subscribers.', sections: [
      ['Business accounts', ['The customer applies from their account. An administrator approves or rejects.', 'Set a discount from 0 to 20% and 0 to 180 days to pay.', 'The approval email goes out in the language of the application.']],
      ['Customer account', ['Orders, addresses, buy again, favorites and saved machines.', 'A saved machine links to the search for parts that fit.']],
      ['Newsletter', ['The footer saves sign-ups. The panel downloads the list as CSV, without people who opted out.', 'The store sends no campaigns.', 'There is no email confirmation yet, so someone else may have typed an address: confirm it before using it in campaigns.', 'A person who opted out stays off the list even if someone signs them up.']],
    ] },
  },
  {
    slug: 'devoluciones-resenas',
    group: 'sell',
    es: { title: 'Devoluciones y reseñas', summary: 'Solicitudes de los clientes y moderación.', sections: [
      ['Devoluciones', ['El cliente la pide con un enlace firmado, indicando productos y motivo.', 'El equipo aprueba, rechaza o marca la mercancía como recibida, y puede dejar una nota.', 'El dinero se devuelve aparte, desde el pedido.']],
      ['Reseñas', ['Solo los compradores pueden escribirlas, con un enlace firmado.', 'Nada aparece en la tienda hasta que se apruebe.']],
    ] },
    en: { title: 'Returns and reviews', summary: 'Customer requests and moderation.', sections: [
      ['Returns', ['The customer requests one through a signed link, with products and reason.', 'The team approves, rejects or marks goods received, and can add a note.', 'Money is returned separately, from the order.']],
      ['Reviews', ['Only buyers can write them, through a signed link.', 'Nothing appears in the store until approved.']],
    ] },
  },
  {
    slug: 'productos',
    group: 'catalog',
    es: { title: 'Productos', summary: 'Crear, importar y mantener el catálogo.', sections: [
      ['Ficha', ['Nombre y descripción en inglés y español, SKU, marca, categoría, precio y stock.', 'Hasta 8 fotos en JPG, PNG o WebP. Usa solo fotos que puedas publicar.', 'Stock vacío significa sin control de inventario.']],
      ['Compatibilidad', ['Máquinas compatibles, una por renglón: Marca | Modelo | Años.', 'Los clientes solo las ven y buscan por máquina si la casilla de verificación con datos del proveedor está marcada.']],
      ['Importar', ['El CSV crea productos nuevos y actualiza los SKU existentes.', 'Si una línea tiene un problema no se importa nada y se listan todos los problemas.']],
    ] },
    en: { title: 'Products', summary: 'Create, import and maintain the catalog.', sections: [
      ['Product form', ['Name and description in English and Spanish, SKU, brand, category, price and stock.', 'Up to 8 photos in JPG, PNG or WebP. Use only photos you may publish.', 'Empty stock means inventory is not tracked.']],
      ['Fitment', ['Machines it fits, one per line: Make | Model | Years.', 'Customers see them and can search by machine only if the supplier-verified box is checked.']],
      ['Import', ['The CSV creates new products and updates existing SKUs.', 'If any line has a problem, nothing is imported and every problem is listed.']],
    ] },
  },
  {
    slug: 'inventario',
    group: 'catalog',
    es: { title: 'Inventario y proveedores', summary: 'Bodegas, ajustes, alertas y órdenes a proveedor.', sections: [
      ['Stock', ['Cada cambio queda registrado con motivo y autor.', 'Una venta descuenta de la bodega con más stock.', 'Cada producto puede tener su propio punto de alerta y proveedor.']],
      ['Órdenes a proveedor', ['Líneas: SKU | Cantidad | Costo unitario.', 'Con correo de proveedor aparece Enviar al proveedor. Requiere el correo conectado.', 'El mensaje incluye la dirección de la bodega: 1350 NW 121 ST AVE, Miami, FL 33182.', 'Recibir la orden suma el stock una sola vez.']],
    ] },
    en: { title: 'Inventory and suppliers', summary: 'Warehouses, adjustments, alerts and supplier orders.', sections: [
      ['Stock', ['Every change is recorded with reason and author.', 'A sale takes stock from the warehouse holding the most.', 'Each product can have its own alert point and supplier.']],
      ['Supplier orders', ['Lines: SKU | Quantity | Unit cost.', 'With a supplier email, Send to supplier appears. Email must be connected.', 'The message includes the warehouse address: 1350 NW 121 ST AVE, Miami, FL 33182.', 'Receiving the order adds stock only once.']],
    ] },
  },
  {
    slug: 'paginas',
    group: 'catalog',
    es: { title: 'Páginas y bloques', summary: 'Crear páginas nuevas de la tienda sin programar.', sections: [
      ['Cómo crear una', ['Contenido → Páginas → Nueva página.', 'Pon título y dirección. Quedará en /p/tu-direccion.', 'Agrega bloques y revísalos en la vista previa, en EN y ES.', 'Marca Publicada y guarda. Solo un administrador puede guardar o borrar.']],
      ['Bloques', ['Encabezado, texto, imagen, tarjetas, preguntas y llamado a la acción.', 'Tarjetas: Título | Texto, una por renglón. Preguntas: Pregunta | Respuesta, una por renglón.', 'Si falta el español, se muestra el inglés.']],
      ['Límites', ['La portada y las páginas existentes aparecen en la lista como fijas, pero su texto no se edita aquí.', 'Las imágenes salen de las que ya tiene el sitio.', 'Una página nueva no aparece sola en el menú: hay que enlazarla.', 'Solo acepta texto, nunca HTML.']],
    ] },
    en: { title: 'Pages and blocks', summary: 'Create new store pages without coding.', sections: [
      ['How to create one', ['Content → Pages → New page.', 'Add a title and address. It will live at /p/your-address.', 'Add blocks and check them in the preview, in EN and ES.', 'Check Published and save. Only an administrator can save or delete.']],
      ['Blocks', ['Heading, text, image, cards, questions and call to action.', 'Cards: Title | Text, one per line. Questions: Question | Answer, one per line.', 'If Spanish is missing, English is shown.']],
      ['Limits', ['The home page and existing pages appear in the list as fixed, but their text is not edited here.', 'Images come from those already on the site.', 'A new page does not appear in the menu by itself: it must be linked.', 'Text only, never HTML.']],
    ] },
  },
  {
    slug: 'analisis',
    group: 'insight',
    es: { title: 'Analítica, contabilidad y actividad', summary: 'Qué se mide y cómo llevarlo a Zoho Books.', sections: [
      ['Analítica', ['Cuenta por sesión del navegador, sin cookies ni datos personales.', 'Muestra el embudo de compra, las búsquedas y los productos más vistos.', 'Las búsquedas sin resultados dicen qué buscan los clientes y no encuentran.']],
      ['Contabilidad', ['La contabilidad se lleva en Zoho Books.', 'Descarga facturas, reembolsos e impuesto por estado en CSV. Solo administradores.', 'Prueba primero con pocos pedidos. La tienda no está conectada directamente a Zoho Books.']],
      ['Actividad', ['Registra quién cambió qué en el panel, lo más reciente primero.']],
    ] },
    en: { title: 'Analytics, accounting and activity', summary: 'What is measured and how to bring it into Zoho Books.', sections: [
      ['Analytics', ['Counted by browser session, with no cookies or personal data.', 'Shows the purchase funnel, searches and most viewed products.', 'Searches with no results show what customers want and do not find.']],
      ['Accounting', ['Accounting is kept in Zoho Books.', 'Download invoices, refunds and tax by state as CSV. Administrators only.', 'Try a few orders first. The store is not connected directly to Zoho Books.']],
      ['Activity', ['Records who changed what in the panel, latest first.']],
    ] },
  },
  {
    slug: 'envio-impuestos',
    group: 'setup',
    es: { title: 'Tarifas de envío e impuestos', summary: 'Lo que se suma en el pago, según el destino.', sections: [
      ['Envío', ['Cada zona tiene estados, cargo base, precio por libra y envío gratis opcional.', 'Son tarifas propias, no precios en vivo de UPS o FedEx.', 'Los productos de flete piden cotización. Sin zonas, los pagos reales se rechazan.']],
      ['Impuestos', ['Las tasas son por estado; una tasa por código postal la reemplaza.', 'Un estado sin tasa no cobra impuesto.', 'Tu contador debe confirmar dónde cobrar y a qué tasa.', 'Hoy no se comprueba que el código postal pertenezca al estado indicado.']],
    ] },
    en: { title: 'Shipping rates and taxes', summary: 'What is added at checkout, based on the destination.', sections: [
      ['Shipping', ['Each zone has states, a base fee, a price per pound and optional free shipping.', 'These are your own rates, not live UPS or FedEx prices.', 'Freight products ask for a quote. With no zones, live payments are refused.']],
      ['Taxes', ['Rates are by state; a ZIP rate replaces it.', 'A state with no rate charges no tax.', 'Your accountant must confirm where to collect and at what rate.', 'The store does not yet check that a ZIP belongs to the given state.']],
    ] },
  },
  {
    slug: 'correos',
    group: 'setup',
    es: { title: 'Correos', summary: 'Los 21 mensajes de la tienda y cómo editarlos.', sections: [
      ['Mensajes', ['Cuenta y compra: bienvenida, empresa aprobada, enlace de pago, pago recibido, pedido a crédito.', 'Entrega y posventa: despachado, en reparto, entregado, reembolso, devolución solicitada y actualización.', 'Recordatorios: carrito sin terminar, recompra y pedir reseña.', 'Equipo: pedido nuevo, pedido a crédito, cotización, devolución, pago por revisar, stock bajo y orden a proveedor.']],
      ['Editar', ['Solo administradores. Cada correo tiene inglés y español, variables para insertar, vista previa y envío de prueba.', 'Restaurar original vuelve al texto inicial.']],
      ['Recordatorios', ['Están apagados hasta activar REMINDERS_ENABLED y definir BUSINESS_POSTAL_ADDRESS, por la ley CAN-SPAM.', 'Máximo un recordatorio de carrito por persona a la semana.']],
    ] },
    en: { title: 'Emails', summary: 'The store’s 21 messages and how to edit them.', sections: [
      ['Messages', ['Account and purchase: welcome, business approved, payment link, payment received, order on terms.', 'Delivery and after-sale: dispatched, out for delivery, delivered, refund, return requested and update.', 'Reminders: unfinished checkout, reorder and review request.', 'Team: new order, order on terms, quote, return, payment review, low stock and supplier order.']],
      ['Editing', ['Administrators only. Each email has English and Spanish, variables to insert, a preview and a test send.', 'Restore original goes back to the initial text.']],
      ['Reminders', ['They stay off until REMINDERS_ENABLED is on and BUSINESS_POSTAL_ADDRESS is set, because of CAN-SPAM.', 'At most one checkout reminder per person per week.']],
    ] },
  },
  {
    slug: 'equipo-permisos',
    group: 'setup',
    es: { title: 'Equipo y permisos', summary: 'Quién puede hacer qué.', sections: [
      ['Roles', ['Personal: opera la tienda: pedidos, envíos, productos e inventario.', 'Administrador: además hace reembolsos, enlaces de pago, facturas pagadas, decisiones de empresas, correos, páginas, exportaciones y esta biblioteca.', 'La persona debe crear antes una cuenta en la tienda.', 'No se puede quitar el rol al único administrador.']],
    ] },
    en: { title: 'Team and permissions', summary: 'Who can do what.', sections: [
      ['Roles', ['Staff: runs the store: orders, shipments, products and inventory.', 'Administrator: also handles refunds, payment links, paid invoices, business decisions, emails, pages, exports and this library.', 'The person must first create a store account.', 'The only administrator cannot lose the role.']],
    ] },
  },
  {
    slug: 'arquitectura',
    group: 'tech',
    es: { title: 'Arquitectura', summary: 'Con qué está hecha la tienda.', sections: [
      ['Componentes', ['Aplicación: Next.js, en Vercel.', 'Base de datos, cuentas y fotos: Supabase.', 'Pagos: PayPal.', 'Correo: buzón de Google Workspace por SMTP.', 'Código: repositorio luispalaciosec/agrotires-web. Publicar en main despliega en Vercel.']],
      ['Tareas automáticas', ['Una revisión diaria (/api/cron/reminders, 15:00 UTC) detecta stock bajo y envía recordatorios si están activos.']],
      ['Migraciones', ['Están en supabase/migrations, de 0001 a 0013, y se corren en orden en Supabase.', '/api/health indica cuáles están aplicadas y si el correo y los pagos están encendidos.']],
    ] },
    en: { title: 'Architecture', summary: 'What the store is built with.', sections: [
      ['Components', ['Application: Next.js, on Vercel.', 'Database, accounts and photos: Supabase.', 'Payments: PayPal.', 'Email: Google Workspace mailbox over SMTP.', 'Code: repository luispalaciosec/agrotires-web. Pushing to main deploys to Vercel.']],
      ['Automatic jobs', ['A daily check (/api/cron/reminders, 15:00 UTC) detects low stock and sends reminders if turned on.']],
      ['Migrations', ['They live in supabase/migrations, 0001 to 0013, and run in order in Supabase.', '/api/health shows which are applied and whether email and payments are on.']],
    ] },
  },
  {
    slug: 'variables',
    group: 'tech',
    es: { title: 'Variables de entorno', summary: 'Qué se configura en Vercel. Los valores nunca se comparten por chat ni por correo.', sections: [
      ['Supabase', ['NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY.']],
      ['PayPal', ['PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, PAYPAL_ENV, PAYMENTS_ENABLED.']],
      ['Correo', ['SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, EMAIL_TEAM.']],
      ['Sitio y seguridad', ['NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SITE_INDEXABLE, LINK_SECRET, CRON_SECRET, REMINDERS_ENABLED, BUSINESS_POSTAL_ADDRESS.']],
    ] },
    en: { title: 'Environment variables', summary: 'What is set in Vercel. Values are never shared by chat or email.', sections: [
      ['Supabase', ['NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY.']],
      ['PayPal', ['PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, PAYPAL_ENV, PAYMENTS_ENABLED.']],
      ['Email', ['SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, EMAIL_TEAM.']],
      ['Site and security', ['NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SITE_INDEXABLE, LINK_SECRET, CRON_SECRET, REMINDERS_ENABLED, BUSINESS_POSTAL_ADDRESS.']],
    ] },
  },
  {
    slug: 'seguridad',
    group: 'tech',
    es: { title: 'Seguridad', summary: 'Qué está protegido y qué falta cerrar.', sections: [
      ['Vigente', ['Las tablas nuevas solo son accesibles desde el servidor.', 'Los enlaces de devolución, reseña y baja van firmados.', 'Los formularios públicos tienen límite de intentos.', 'Las exportaciones CSV están protegidas contra fórmulas maliciosas.']],
      ['Pendiente antes de cobrar', ['Retirar los permisos directos del personal sobre pedidos y productos en la base de datos, antes de crear cuentas de personal.', 'Volver a validar precio y stock en enlaces de pago de carritos.', 'Comprobar que el código postal coincida con el estado.', 'Confirmar por correo las suscripciones al boletín.', 'Poner vencimiento a los enlaces firmados.', 'Exigir verificación en dos pasos a administradores.']],
    ] },
    en: { title: 'Security', summary: 'What is protected and what is left to close.', sections: [
      ['In place', ['New tables are reachable only from the server.', 'Return, review and unsubscribe links are signed.', 'Public forms have attempt limits.', 'CSV exports are protected against malicious formulas.']],
      ['To do before charging', ['Remove staff direct database permissions on orders and products, before creating staff accounts.', 'Re-validate price and stock on cart payment links.', 'Check that the ZIP matches the state.', 'Confirm newsletter sign-ups by email.', 'Add expiry to signed links.', 'Require two-step verification for administrators.']],
    ] },
  },
  {
    slug: 'lanzamiento',
    group: 'tech',
    es: { title: 'Lista para el lanzamiento', summary: 'Lo que falta antes de abrir al público y cobrar.', sections: [
      ['Decisiones y datos de los dueños', ['Aprobar la tienda.', 'Catálogo real: precios, stock, fotos y compatibilidad verificada.', 'Políticas aprobadas de envío, devoluciones y privacidad.', 'Tarifas de envío e impuestos confirmados por el contador.']],
      ['Conexiones', ['PayPal: probar en sandbox y luego pasar a pagos reales, solo con autorización.', 'Correo: contraseña de aplicación del buzón en Vercel.', 'Vercel Pro antes de cobrar: el plan Hobby no es comercial.', 'Dominio: ningún registro DNS se cambia sin autorización previa de los dueños; MX, SPF, DKIM, DMARC y nameservers no se tocan.']],
      ['Al abrir', ['Quitar los avisos de demostración y el catálogo de ejemplo.', 'Abrir a buscadores.', 'Borrar datos de prueba, como la tasa de impuesto de Alabama.']],
    ] },
    en: { title: 'Launch checklist', summary: 'What is left before opening to the public and charging.', sections: [
      ['Owner decisions and data', ['Approve the store.', 'Real catalog: prices, stock, photos and verified fitment.', 'Approved shipping, returns and privacy policies.', 'Shipping rates and taxes confirmed by the accountant.']],
      ['Connections', ['PayPal: test in sandbox, then go live only with authorization.', 'Email: mailbox app password in Vercel.', 'Vercel Pro before charging: the Hobby plan is not commercial.', 'Domain: no DNS record changes without the owners’ prior authorization; MX, SPF, DKIM, DMARC and nameservers stay untouched.']],
      ['At opening', ['Remove demo notices and the sample catalog.', 'Open to search engines.', 'Delete test data, such as the Alabama tax rate.']],
    ] },
  },
];

export const findDoc = (slug: string) => ADMIN_DOCS.find((d) => d.slug === slug);
