// Demo catalog carried over from the prototype. All products and prices are fictional.
// Pages read through the getters below so this file can be swapped for the database.
export const BUSINESS = Object.freeze({
  name: 'AGROTIRES',
  slogan: 'INSTANT SOLUTION',
  domain: 'agrotiresusa.com',
  contactEmail: 'contact@agrotiresusa.com',
});

export const DEMO_CATALOG = true;

export type Category = { id: string; name: string; short: string; desc: string; img: string; tag: string };
export type Product = { id: string; cat: string; name: string; sku: string; price: number; img: string; tags: string[]; desc: string; brand?: string; tireSize?: string; equipmentMake?: string; equipmentModel?: string };
export type Guide = { id: string; title: string; icon: string; subtitle: string; body: string };

export const categories: Category[] = [
  { id: 'tires', name: 'Tires & Wheels', short: 'Agricultural Tires', desc: 'Built around the work you do.', img: 'agro-tires.webp', tag: 'TRACTION MATTERS' },
  { id: 'parts', name: 'Parts & Components', short: 'Machinery Parts', desc: 'Essential components, simplified.', img: 'agro-hydraulics.webp', tag: 'KEEP IT RUNNING' },
  { id: 'equipment', name: 'Equipment & Implements', short: 'Farm Equipment', desc: 'Solutions for every season.', img: 'agro-fieldwork.webp', tag: 'READY FOR WORK' },
  { id: 'maintenance', name: 'Workshop & Maintenance', short: 'Workshop Essentials', desc: 'For the jobs between jobs.', img: 'agro-maintenance.webp', tag: 'EVERYDAY ESSENTIALS' },
  { id: 'technology', name: 'Agricultural Technology', short: 'Ag Technology', desc: 'Smarter tools for modern farming.', img: 'agro-precision.webp', tag: 'FARM SMARTER' },
  { id: 'machine', name: 'Shop by Machine', short: 'Shop by Machine', desc: 'Start with your equipment.', img: 'agro-harvest.webp', tag: 'FIND YOUR FIT' },
];

export const products: Product[] = [
  { id: 'tire-r1', cat: 'tires', name: 'Rear Tractor Tire — Demo R1', sku: 'DEMO-TIR-001', price: 689, img: 'agro-tires.webp', tags: ['Tractor'], desc: 'Illustrative agricultural rear tire listing used to demonstrate product discovery and checkout layout. Tire size and fitment must be verified from a real supplier.' },
  { id: 'filter-h7', cat: 'parts', name: 'Hydraulic Filter — Demo H7', sku: 'DEMO-PRT-002', price: 42, img: 'agro-maintenance.webp', tags: ['Tractor', 'Combine'], desc: 'Illustrative hydraulic filter listing showing how technical products can be presented with clear specifications.' },
  { id: 'hose-h3', cat: 'parts', name: 'Hydraulic Hose — Demo H3', sku: 'DEMO-PRT-003', price: 118, img: 'agro-hydraulics.webp', tags: ['Tractor', 'Sprayer'], desc: 'Illustrative hydraulic hose assembly listing. Real hose pressure ratings and compatibility data are not supplied.' },
  { id: 'gps-g4', cat: 'technology', name: 'Guidance Receiver — Demo G4', sku: 'DEMO-TEC-004', price: 845, img: 'agro-precision.webp', tags: ['Tractor', 'Planter'], desc: 'Illustrative precision agriculture receiver for exploring the store layout. Not associated with any manufacturer.' },
  { id: 'tire-i2', cat: 'tires', name: 'Implement Tire — Demo I2', sku: 'DEMO-TIR-005', price: 219, img: 'agro-tires.webp', tags: ['Implement', 'Planter'], desc: 'Illustrative implement tire. No tire size, load capacity or machine fitment is confirmed.' },
  { id: 'belt-b3', cat: 'parts', name: 'Drive Belt — Demo B3', sku: 'DEMO-PRT-006', price: 74, img: 'agro-drive-belt.webp', tags: ['Combine', 'Tractor'], desc: 'Illustrative drive belt for demonstrating part-number browsing and shopping cart features.' },
  { id: 'tool-k2', cat: 'maintenance', name: 'Field Tool Kit — Demo K2', sku: 'DEMO-MNT-007', price: 129, img: 'agro-toolkit.webp', tags: ['Tractor', 'Implement'], desc: 'Illustrative workshop tool kit for layout demonstration only.' },
  { id: 'sensor-p8', cat: 'technology', name: 'Monitoring Module — Demo P8', sku: 'DEMO-TEC-008', price: 279, img: 'agro-precision.webp', tags: ['Sprayer', 'Planter'], desc: 'Illustrative monitoring accessory. Features and compatibility are not verified.' },
  { id: 'tire-f3', cat: 'tires', name: 'Front Tractor Tire — Demo F3', sku: 'DEMO-TIR-009', price: 319, img: 'agro-tires.webp', tags: ['Tractor'], desc: 'Illustrative front tractor tire listing with demonstration pricing.' },
  { id: 'wheel-w5', cat: 'equipment', name: 'Gauge Wheel Kit — Demo W5', sku: 'DEMO-EQP-010', price: 296, img: 'agro-gauge-wheel.webp', tags: ['Planter', 'Implement'], desc: 'Illustrative planter-related wheel kit. No fitment or technical dimensions available.' },
  { id: 'coupler-c1', cat: 'parts', name: 'Hydraulic Coupler Set — Demo C1', sku: 'DEMO-PRT-011', price: 76, img: 'agro-hydraulics.webp', tags: ['Tractor', 'Implement'], desc: 'Illustrative hydraulic coupler set with generic category information.' },
  { id: 'filter-e9', cat: 'maintenance', name: 'Service Filter Kit — Demo E9', sku: 'DEMO-MNT-012', price: 59, img: 'agro-maintenance.webp', tags: ['Combine', 'Sprayer'], desc: 'Illustrative service filter kit used to demonstrate agricultural maintenance merchandising.' },
];

export const guides: Guide[] = [
  { id: 'tire-size', title: 'How to read agricultural tire sizes', icon: 'compass', subtitle: 'Know which measurements and ratings to check before you buy.', body: 'Agricultural tire size markings can include section width, aspect ratio, rim diameter, construction type, and load or speed symbols. Always verify the complete specification against the equipment maker’s requirements and the actual tire manufacturer documentation. The demo products shown on this site do not include verified sizes.' },
  { id: 'parts', title: 'Finding the right replacement part', icon: 'wrench', subtitle: 'A quick checklist for shopping with more confidence.', body: 'Begin with the equipment manufacturer, exact model designation, serial number range, and original part number. Compare physical dimensions and technical ratings when applicable. A matching general description alone does not establish compatibility.' },
  { id: 'freight', title: 'Shipping large agricultural equipment', icon: 'truck', subtitle: 'What to prepare when requesting a freight quote.', body: 'Freight providers typically need item dimensions, weight, origin and destination ZIP codes, destination type, and unloading requirements. These details affect the available service and final rate. AGROTIRES shipping services and freight partners remain to be configured.' },
];

export const faqs: [string, string][] = [
  ['Can I buy from this website now?', 'Not yet. This is an interactive storefront demonstration. Products and prices are illustrative, and no real orders or payments are processed.'],
  ['How will shipping work?', 'The production store can support parcel shipping and freight quotations after shipping origin, service areas, products, and carriers are configured. No delivery time or cost is currently promised.'],
  ['How can I check whether a part fits?', 'The current product finder searches demo product tags only. Production compatibility must be validated using accurate equipment, serial-number, and manufacturer data.'],
  ['Can I create an AGROTIRES account?', 'A production-ready account system requires a connected authentication backend. The account page shows what is planned; no passwords are accepted in this demonstration.'],
  ['How do I request a quote?', 'Fill out the quote form and choose Compose email to open a prefilled message to contact@agrotiresusa.com. You must send that message from your email application. The Save demo inquiry option only stores a local draft and does not send anything.'],
];

export const getCategory = (id: string) => categories.find((c) => c.id === id);
export const getGuide = (id: string) => guides.find((g) => g.id === id);
// Until photo upload exists, products pick from the images already in /public/assets.
export const PRODUCT_IMAGES = ['agro-tires.webp', 'agro-hydraulics.webp', 'agro-fieldwork.webp', 'agro-maintenance.webp', 'agro-precision.webp', 'agro-harvest.webp', 'agro-drive-belt.webp', 'agro-toolkit.webp', 'agro-gauge-wheel.webp'];
export const money = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
export const catHref = (id: string) => '/shop?category=' + encodeURIComponent(id);
export const productHref = (id: string) => '/product/' + encodeURIComponent(id);
