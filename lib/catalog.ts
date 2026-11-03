import type { Fitment } from './fitment';
import type { Locale } from './i18n';

// Demo catalog carried over from the prototype. All products and prices are fictional.
// Pages read through the getters below so this file can be swapped for the database.
export const BUSINESS = Object.freeze({
  name: 'AGROTIRES',
  slogan: 'INSTANT SOLUTION',
  domain: 'agrotiresusa.com',
  contactEmail: 'contact@agrotiresusa.com',
  warehouse: { lines: ['1350 NW 121 ST AVE', 'Miami, FL 33182'] },
});

export const DEMO_CATALOG = true;

export type Category = { id: string; name: string; short: string; desc: string; img: string; tag: string };
// name and desc are already in the page's language; alt is the name in the other one, for search.
export type Product = { id: string; cat: string; name: string; sku: string; price: number; img: string; gallery?: string[]; fitment?: Fitment[]; volume?: { minQty: number; price: number }[]; tags: string[]; desc: string; brand?: string; tireSize?: string; equipmentMake?: string; equipmentModel?: string; alt?: string };
export type DemoProduct = Omit<Product, 'alt'> & { nameEs: string; descEs: string };
export type Guide = { id: string; title: string; icon: string; subtitle: string; body: string };

type Spanish<T> = Partial<Record<keyof T, string>>;

export const categories: Category[] = [
  { id: 'tires', name: 'Tires & Wheels', short: 'Agricultural Tires', desc: 'Built around the work you do.', img: 'agro-tires.webp', tag: 'TRACTION MATTERS' },
  { id: 'parts', name: 'Parts & Components', short: 'Machinery Parts', desc: 'Essential components, simplified.', img: 'agro-hydraulics.webp', tag: 'KEEP IT RUNNING' },
  { id: 'equipment', name: 'Equipment & Implements', short: 'Farm Equipment', desc: 'Solutions for every season.', img: 'agro-fieldwork.webp', tag: 'READY FOR WORK' },
  { id: 'maintenance', name: 'Workshop & Maintenance', short: 'Workshop Essentials', desc: 'For the jobs between jobs.', img: 'agro-maintenance.webp', tag: 'EVERYDAY ESSENTIALS' },
  { id: 'technology', name: 'Agricultural Technology', short: 'Ag Technology', desc: 'Smarter tools for modern farming.', img: 'agro-precision.webp', tag: 'FARM SMARTER' },
  { id: 'machine', name: 'Shop by Machine', short: 'Shop by Machine', desc: 'Start with your equipment.', img: 'agro-harvest.webp', tag: 'FIND YOUR FIT' },
];

const categoriesEs: Record<string, Spanish<Category>> = {
  tires: { name: 'Llantas y ruedas', short: 'Llantas agrícolas', desc: 'Pensadas para el trabajo que haces.', tag: 'LA TRACCIÓN IMPORTA' },
  parts: { name: 'Piezas y componentes', short: 'Piezas de maquinaria', desc: 'Componentes esenciales, sin complicaciones.', tag: 'SIEMPRE EN MARCHA' },
  equipment: { name: 'Equipos e implementos', short: 'Equipos agrícolas', desc: 'Soluciones para cada temporada.', tag: 'LISTOS PARA TRABAJAR' },
  maintenance: { name: 'Taller y mantenimiento', short: 'Esenciales de taller', desc: 'Para los trabajos entre trabajos.', tag: 'ESENCIALES DEL DÍA A DÍA' },
  technology: { name: 'Tecnología agrícola', short: 'Tecnología agrícola', desc: 'Herramientas más inteligentes para la agricultura moderna.', tag: 'CULTIVA CON INTELIGENCIA' },
  machine: { name: 'Comprar por máquina', short: 'Comprar por máquina', desc: 'Empieza por tu equipo.', tag: 'ENCUENTRA LO TUYO' },
};

export const products: DemoProduct[] = [
  { id: 'tire-r1', cat: 'tires', name: 'Rear Tractor Tire — Demo R1', nameEs: 'Llanta trasera de tractor — Demo R1', sku: 'DEMO-TIR-001', price: 689, img: 'agro-tires.webp', tags: ['Tractor'], desc: 'Illustrative agricultural rear tire listing used to demonstrate product discovery and checkout layout. Tire size and fitment must be verified from a real supplier.', descEs: 'Ficha ilustrativa de una llanta agrícola trasera, usada para mostrar la búsqueda de productos y el diseño del pago. La medida y la compatibilidad deben verificarse con un proveedor real.' },
  { id: 'filter-h7', cat: 'parts', name: 'Hydraulic Filter — Demo H7', nameEs: 'Filtro hidráulico — Demo H7', sku: 'DEMO-PRT-002', price: 42, img: 'agro-maintenance.webp', tags: ['Tractor', 'Combine'], desc: 'Illustrative hydraulic filter listing showing how technical products can be presented with clear specifications.', descEs: 'Ficha ilustrativa de un filtro hidráulico que muestra cómo presentar productos técnicos con especificaciones claras.' },
  { id: 'hose-h3', cat: 'parts', name: 'Hydraulic Hose — Demo H3', nameEs: 'Manguera hidráulica — Demo H3', sku: 'DEMO-PRT-003', price: 118, img: 'agro-hydraulics.webp', tags: ['Tractor', 'Sprayer'], desc: 'Illustrative hydraulic hose assembly listing. Real hose pressure ratings and compatibility data are not supplied.', descEs: 'Ficha ilustrativa de un conjunto de manguera hidráulica. No se incluyen datos reales de presión ni de compatibilidad.' },
  { id: 'gps-g4', cat: 'technology', name: 'Guidance Receiver — Demo G4', nameEs: 'Receptor de guiado — Demo G4', sku: 'DEMO-TEC-004', price: 845, img: 'agro-precision.webp', tags: ['Tractor', 'Planter'], desc: 'Illustrative precision agriculture receiver for exploring the store layout. Not associated with any manufacturer.', descEs: 'Receptor ilustrativo de agricultura de precisión para explorar el diseño de la tienda. No está asociado a ningún fabricante.' },
  { id: 'tire-i2', cat: 'tires', name: 'Implement Tire — Demo I2', nameEs: 'Llanta para implemento — Demo I2', sku: 'DEMO-TIR-005', price: 219, img: 'agro-tires.webp', tags: ['Implement', 'Planter'], desc: 'Illustrative implement tire. No tire size, load capacity or machine fitment is confirmed.', descEs: 'Llanta ilustrativa para implemento. No se confirma medida, capacidad de carga ni compatibilidad con máquinas.' },
  { id: 'belt-b3', cat: 'parts', name: 'Drive Belt — Demo B3', nameEs: 'Correa de transmisión — Demo B3', sku: 'DEMO-PRT-006', price: 74, img: 'agro-drive-belt.webp', tags: ['Combine', 'Tractor'], desc: 'Illustrative drive belt for demonstrating part-number browsing and shopping cart features.', descEs: 'Correa ilustrativa para mostrar la búsqueda por número de pieza y las funciones del carrito.' },
  { id: 'tool-k2', cat: 'maintenance', name: 'Field Tool Kit — Demo K2', nameEs: 'Kit de herramientas de campo — Demo K2', sku: 'DEMO-MNT-007', price: 129, img: 'agro-toolkit.webp', tags: ['Tractor', 'Implement'], desc: 'Illustrative workshop tool kit for layout demonstration only.', descEs: 'Kit ilustrativo de herramientas de taller, solo para demostrar el diseño.' },
  { id: 'sensor-p8', cat: 'technology', name: 'Monitoring Module — Demo P8', nameEs: 'Módulo de monitoreo — Demo P8', sku: 'DEMO-TEC-008', price: 279, img: 'agro-precision.webp', tags: ['Sprayer', 'Planter'], desc: 'Illustrative monitoring accessory. Features and compatibility are not verified.', descEs: 'Accesorio ilustrativo de monitoreo. Sus funciones y compatibilidad no están verificadas.' },
  { id: 'tire-f3', cat: 'tires', name: 'Front Tractor Tire — Demo F3', nameEs: 'Llanta delantera de tractor — Demo F3', sku: 'DEMO-TIR-009', price: 319, img: 'agro-tires.webp', tags: ['Tractor'], desc: 'Illustrative front tractor tire listing with demonstration pricing.', descEs: 'Ficha ilustrativa de una llanta delantera de tractor con precio de demostración.' },
  { id: 'wheel-w5', cat: 'equipment', name: 'Gauge Wheel Kit — Demo W5', nameEs: 'Kit de ruedas limitadoras — Demo W5', sku: 'DEMO-EQP-010', price: 296, img: 'agro-gauge-wheel.webp', tags: ['Planter', 'Implement'], desc: 'Illustrative planter-related wheel kit. No fitment or technical dimensions available.', descEs: 'Kit ilustrativo de ruedas para sembradora. No hay datos de compatibilidad ni dimensiones técnicas.' },
  { id: 'coupler-c1', cat: 'parts', name: 'Hydraulic Coupler Set — Demo C1', nameEs: 'Juego de acoples hidráulicos — Demo C1', sku: 'DEMO-PRT-011', price: 76, img: 'agro-hydraulics.webp', tags: ['Tractor', 'Implement'], desc: 'Illustrative hydraulic coupler set with generic category information.', descEs: 'Juego ilustrativo de acoples hidráulicos con información general de la categoría.' },
  { id: 'filter-e9', cat: 'maintenance', name: 'Service Filter Kit — Demo E9', nameEs: 'Kit de filtros de servicio — Demo E9', sku: 'DEMO-MNT-012', price: 59, img: 'agro-maintenance.webp', tags: ['Combine', 'Sprayer'], desc: 'Illustrative service filter kit used to demonstrate agricultural maintenance merchandising.', descEs: 'Kit ilustrativo de filtros de servicio, usado para mostrar cómo presentar productos de mantenimiento agrícola.' },
];

export const guides: Guide[] = [
  { id: 'tire-size', title: 'How to read agricultural tire sizes', icon: 'compass', subtitle: 'Know which measurements and ratings to check before you buy.', body: 'Agricultural tire size markings can include section width, aspect ratio, rim diameter, construction type, and load or speed symbols. Always verify the complete specification against the equipment maker’s requirements and the actual tire manufacturer documentation. The demo products shown on this site do not include verified sizes.' },
  { id: 'parts', title: 'Finding the right replacement part', icon: 'wrench', subtitle: 'A quick checklist for shopping with more confidence.', body: 'Begin with the equipment manufacturer, exact model designation, serial number range, and original part number. Compare physical dimensions and technical ratings when applicable. A matching general description alone does not establish compatibility.' },
  { id: 'freight', title: 'Shipping large agricultural equipment', icon: 'truck', subtitle: 'What to prepare when requesting a freight quote.', body: 'Freight providers typically need item dimensions, weight, origin and destination ZIP codes, destination type, and unloading requirements. These details affect the available service and final rate. AGROTIRES shipping services and freight partners remain to be configured.' },
];

const guidesEs: Record<string, Spanish<Guide>> = {
  'tire-size': { title: 'Cómo leer las medidas de llantas agrícolas', subtitle: 'Qué medidas y clasificaciones revisar antes de comprar.', body: 'Las marcas de medida de una llanta agrícola pueden incluir el ancho de sección, la relación de aspecto, el diámetro del rin, el tipo de construcción y los símbolos de carga o velocidad. Verifica siempre la especificación completa con los requisitos del fabricante del equipo y la documentación del fabricante de la llanta. Los productos de demostración de este sitio no incluyen medidas verificadas.' },
  parts: { title: 'Cómo encontrar la pieza de repuesto correcta', subtitle: 'Una lista rápida para comprar con más confianza.', body: 'Empieza por el fabricante del equipo, la designación exacta del modelo, el rango de números de serie y el número de pieza original. Compara las dimensiones físicas y las clasificaciones técnicas cuando corresponda. Una descripción general parecida no basta para confirmar la compatibilidad.' },
  freight: { title: 'Cómo enviar equipos agrícolas grandes', subtitle: 'Qué preparar al solicitar una cotización de flete.', body: 'Las empresas de flete suelen necesitar las dimensiones y el peso del artículo, los códigos postales de origen y destino, el tipo de destino y los requisitos de descarga. Estos datos influyen en el servicio disponible y en la tarifa final. Los servicios de envío y los socios de flete de AGROTIRES aún están por configurar.' },
};

const faqsEn: [string, string][] = [
  ['Can I buy from this website now?', 'Not yet. This is an interactive storefront demonstration. Products and prices are illustrative, and no real orders or payments are processed.'],
  ['How will shipping work?', 'The production store can support parcel shipping and freight quotations after shipping origin, service areas, products, and carriers are configured. No delivery time or cost is currently promised.'],
  ['How can I check whether a part fits?', 'The current product finder searches demo product tags only. Production compatibility must be validated using accurate equipment, serial-number, and manufacturer data.'],
  ['Can I create an AGROTIRES account?', 'A production-ready account system requires a connected authentication backend. The account page shows what is planned; no passwords are accepted in this demonstration.'],
  ['How do I request a quote?', 'Fill out the quote form and choose Compose email to open a prefilled message to contact@agrotiresusa.com. You must send that message from your email application. The Save demo inquiry option only stores a local draft and does not send anything.'],
];

const faqsEs: [string, string][] = [
  ['¿Puedo comprar en este sitio ahora?', 'Todavía no. Esta es una demostración interactiva de la tienda. Los productos y precios son ilustrativos, y no se procesan pedidos ni pagos reales.'],
  ['¿Cómo funcionarán los envíos?', 'La tienda final podrá ofrecer envíos por paquetería y cotizaciones de flete cuando se configuren el origen, las zonas de servicio, los productos y los transportistas. Por ahora no se promete ningún plazo ni costo de entrega.'],
  ['¿Cómo compruebo si una pieza es compatible?', 'El buscador actual solo revisa etiquetas de productos de demostración. La compatibilidad real debe validarse con datos precisos del equipo, el número de serie y el fabricante.'],
  ['¿Puedo crear una cuenta en AGROTIRES?', 'Un sistema de cuentas listo para usar requiere un servicio de autenticación conectado. La página de cuenta muestra lo que está previsto; en esta demostración no se aceptan contraseñas.'],
  ['¿Cómo solicito una cotización?', 'Completa el formulario de cotización y elige Redactar correo para abrir un mensaje prellenado dirigido a contact@agrotiresusa.com. Debes enviar ese mensaje desde tu aplicación de correo. La opción de guardar borrador solo almacena una copia local y no envía nada.'],
];

const merge = <T extends { id: string }>(item: T, es: Spanish<T> | undefined, locale: Locale): T => (locale === 'es' ? { ...item, ...es } : item);

export const getCategories = (locale: Locale = 'en') => categories.map((c) => merge(c, categoriesEs[c.id], locale));
export const getCategory = (id: string, locale: Locale = 'en') => getCategories(locale).find((c) => c.id === id);
export const getGuides = (locale: Locale = 'en') => guides.map((g) => merge(g, guidesEs[g.id], locale));
export const getGuide = (id: string, locale: Locale = 'en') => getGuides(locale).find((g) => g.id === id);
export const getFaqs = (locale: Locale = 'en') => (locale === 'es' ? faqsEs : faqsEn);

// A blank Spanish text falls back to English, so nothing shows up empty.
export function localizeProduct<T extends { name: string; desc: string; nameEs?: string; descEs?: string }>(p: T, locale: Locale) {
  const { nameEs, descEs, ...rest } = p;
  return locale === 'es'
    ? { ...rest, name: nameEs || p.name, desc: descEs || p.desc, alt: p.name }
    : { ...rest, alt: nameEs };
}

// Until photo upload exists, products pick from the images already in /public/assets.
// Bundled images are stored by file name, photos uploaded from the panel by their address.
export const isUploadedImage = (img: string) => /^(https:\/\/|\/uploads\/)/.test(img);
export const imageSrc = (img: string) => (isUploadedImage(img) ? img : `/assets/${img}`);
export const productImages = (p: { img: string; gallery?: string[] }) => [p.img, ...(p.gallery ?? [])];

export const PRODUCT_IMAGES = ['agro-tires.webp', 'agro-hydraulics.webp', 'agro-fieldwork.webp', 'agro-maintenance.webp', 'agro-precision.webp', 'agro-harvest.webp', 'agro-drive-belt.webp', 'agro-toolkit.webp', 'agro-gauge-wheel.webp'];
export const money = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
export const catHref = (id: string) => '/shop?category=' + encodeURIComponent(id);
export const productHref = (id: string) => '/product/' + encodeURIComponent(id);
