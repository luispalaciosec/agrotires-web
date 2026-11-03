# Pruebas de aceptación de AGROTIRES

Se ejecutan antes de abrir al público, primero en PayPal sandbox y al final con un pedido real controlado.
Marca cada punto con la fecha y quién lo probó. Si algo falla, anota el mensaje exacto.

## Requisitos previos
- [ ] Credenciales PayPal sandbox en Vercel (`PAYMENTS_ENABLED`, `PAYPAL_ENV`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`).
- [ ] Contraseña de aplicación del correo en Vercel (`SMTP_USER`, `SMTP_PASS`).
- [ ] Al menos un producto real visible, con peso y stock.
- [ ] Una zona de envío y una tasa de impuesto de prueba.

## Compra
- [ ] Comprar sin cuenta con PayPal: el total del resumen es igual al cobrado en PayPal.
- [ ] Comprar con tarjeta de prueba de sandbox.
- [ ] Pago rechazado: aparece el aviso y el pedido queda como fallido.
- [ ] Cancelar en PayPal: aparece el aviso y no se cobra.
- [ ] Reintentar después de un rechazo.
- [ ] Estado sin tarifa de envío: pide cotización y no deja pagar.
- [ ] Producto de flete: pide cotización y no deja pagar.
- [ ] Sin stock: no deja comprar más de lo disponible.
- [ ] El stock baja una sola vez por compra.
- [ ] Llegan el correo al cliente y el aviso al equipo.

## Cuentas
- [ ] Crear cuenta y confirmar el correo.
- [ ] Llega una sola vez el correo de bienvenida.
- [ ] Iniciar sesión, cerrar sesión y recuperar contraseña.
- [ ] Guardar y borrar una dirección.
- [ ] Comprar con sesión: los datos se rellenan y el pedido aparece en la cuenta.
- [ ] "Volver a comprar" llena el carrito.
- [ ] Una cuenta no ve pedidos ni direcciones de otra.

## Empresas
- [ ] Solicitar cuenta de empresa y aprobarla con descuento y días de crédito.
- [ ] El descuento aparece en el pago y coincide con lo cobrado.
- [ ] Pedido a crédito: queda "On terms", con fecha límite, y se puede marcar como pagado.
- [ ] Precio por volumen al llegar a la cantidad.

## Después de la venta
- [ ] Crear envío: llega el correo con el enlace de seguimiento.
- [ ] Actualizar estado y ubicación: se ve en la página pública.
- [ ] Reembolso parcial y luego total; el correo llega en el idioma del cliente.
- [ ] Reembolso hecho en PayPal: se refleja en el panel por el webhook.
- [ ] Cotización a enlace de pago: se puede pagar una sola vez.
- [ ] Reseña desde la cuenta: queda pendiente y aparece al aprobarla.

## Panel y seguridad
- [ ] Una cuenta de personal no puede reembolsar.
- [ ] Sin sesión, ninguna página de `/admin` abre.
- [ ] Editar un correo, enviar prueba y restaurar el original.
- [ ] Revisar en móvil: pago, seguimiento y panel.

## Dominio (solo con autorización escrita de los dueños)
- [ ] Anotar los registros DNS actuales antes de tocar nada.
- [ ] Conectar `agrotiresusa.com` sin cambiar MX, SPF, DKIM ni DMARC.
- [ ] HTTPS y `www` funcionan.
- [ ] `contact@agrotiresusa.com` envía y recibe, antes y después del cambio.
- [ ] Actualizar `NEXT_PUBLIC_SITE_URL` y las URL de Supabase.

## Lanzamiento
- [ ] Cambiar `DEMO_CATALOG` y quitar los avisos de demo.
- [ ] Políticas aprobadas publicadas.
- [ ] Vercel Pro activo.
- [ ] Credenciales reales de PayPal y un pedido real controlado, con reembolso.
- [ ] Activar `NEXT_PUBLIC_SITE_INDEXABLE=true`.
