# ADR 0004 — Despacho manual multi-empresa (cotización MiCorreo + recargo, sin precarga)

**Fecha:** 2026-10-16
**Estado:** aceptada

## Problema

Glamify precargaba cada envío pagado en MiCorreo (`autoImportShipment`, botón de reintento, panel MiCorreo en el admin), le hacía elegir la sucursal de Correo a la clienta en el checkout, no pedía DNI y, si no encontraba zona de envío, cobraba $0. La dueña despacha con la empresa que le convenga en el momento, y la precarga solo servía para Correo. Hazing (ADR 0007 de ese repo) ya resolvió esto en producción con un esquema más simple.

## Decisión

1. **Cotización:** MiCorreo en vivo por CP/peso/método (sucursal = `deliveredType: "S"`) **más un recargo fijo** editable en Ajustes (`Setting.shippingSurcharge`, default $0; sirve para cubrir el empaque). La zona de respaldo (`ShippingZone`) no lleva recargo y conserva `methodFactor` 0,7 para sucursal. **Nunca se cobra $0 por error** (PR #47): CP sin zona → la zona activa más cara × método; sin ninguna zona → el checkout no deja pagar.
2. **Despacho manual:** la dueña elige la empresa (Correo Argentino, Andreani, OCA, Vía Cargo; enum `ShipmentCarrier`) y pega el código en el pedido. El pedido pasa a `shipped` con precondición atómica por status. El mail a la clienta sale en el primer despacho y cada vez que cambia el código o la empresa; hay botón "Reenviar mail de despacho". El botón del mail va a `/seguimiento/<id>` (empresa + código para copiar + link a la página de la empresa).
3. **Sin precarga en MiCorreo:** se eliminan `autoImportShipment`, `createMicorreoShipment`, `getMicorreoAgencies`, `retryMicorreoImport` y el panel. La columna `Shipment.micorreoImportedAt` queda sin uso (borrarla es otra decisión).
4. **Sucursal sin selector:** la clienta pone provincia + localidad + CP; la sucursal de retiro la escribe la dueña (texto libre opcional) al despachar y va en el mail. Se guarda en `Order.shippingAddress.pickupBranch`, no en `Shipment.trackingLastEvent`, porque el cron de seguimiento pisa ese campo y el cambio de código lo borra.
5. **DNI de quien recibe:** obligatorio en pedidos con envío físico (7–8 dígitos, normalizado), guardado en `Order.shippingAddress.dni` (sin migración), visible en la tarjeta "Entrega" del admin y declarado en `/privacidad`. El servidor guarda solo las claves de dirección conocidas.
6. **Seguimiento automático solo para Correo:** el cron filtra `carrier = correo_argentino` y ya no reintenta por número de pedido (era el `extOrderId` de la precarga). Para las otras empresas, la dueña cambia el estado a mano.

## Riesgo conocido

Sin precarga es probable que la API de tracking de MiCorreo no encuentre los envíos (hipótesis registrada en `docs/LAUNCH.md`: solo ve los importados por API). En ese caso el job no cambia nada y el pedido queda en `shipped`; el estado manual sigue disponible. Se confirma con la primera venta despachada por Correo; si no encuentra, se saca el cron.

## Alternativas descartadas

- **Mantener la precarga solo para Correo:** duplica el camino (precarga + manual) para una de cuatro empresas y exige saldo cargado en MiCorreo.
- **Guardar la sucursal de retiro en `trackingLastEvent`:** colisiona con el cron de Correo.
- **Elegir sucursal en el checkout:** la sucursal real depende de la empresa con la que despache la dueña, que se decide después del pago.

## Consecuencias

- Migración aditiva `20261016120000_envios_como_hazing` (3 valores de enum + 1 columna con default): se corre en prod antes del merge.
- `correo.ts` y `zipnova.ts` siguen en el repo sin uso (limpieza aparte).
