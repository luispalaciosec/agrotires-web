# AGROTIRES web

Tienda en Next.js, construida a partir del mockup en `../generadores/`.

```bash
npm install
npm run build
npm run start
```

- `app/`: páginas. Cada ruta corresponde a una ruta del mockup.
- `components/`: partes de la interfaz. `store.tsx` guarda carrito y favoritos en el navegador.
- `lib/catalog.ts`: catálogo de ejemplo. Las páginas lo leen con sus funciones, para cambiarlo luego por la base de datos.
- `lib/seo.ts`: datos estructurados. `NEXT_PUBLIC_SITE_INDEXABLE` queda en `false` hasta que los dueños aprueben el lanzamiento.
- `lib/server/supabase-store.ts`: datos en Supabase cuando están sus variables de entorno.
- `supabase/migrations/`: esquema de la base de datos, para ejecutar en orden.
- `/api/health`: indica si la base responde y qué migraciones faltan, sin mostrar datos.

No cambiar DNS ni registros de correo sin autorización de los dueños.
