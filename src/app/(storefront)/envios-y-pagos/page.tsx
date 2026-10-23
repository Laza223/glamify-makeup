import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/legal/prose";
import { businessInfo } from "@/lib/legal/business-info";
import { getFreeShippingThreshold } from "@/lib/orders/checkout-data";
import { formatARS } from "@/lib/money";

export const metadata: Metadata = {
  title: "Envíos y pagos",
  description: "Costos y plazos de envío, envío gratis y medios de pago en Glamify Makeup.",
};

export default async function EnviosYPagosPage() {
  const threshold = await getFreeShippingThreshold();

  return (
    <Prose>
      <h1>Envíos y <em>pagos</em></h1>

      <h2>Envíos</h2>
      <p>
        Enviamos a toda la Argentina con Correo Argentino, Andreani, OCA o Vía Cargo, con opción de entrega a domicilio o retiro en
        sucursal (te avisamos por mail cuál sucursal). Pedimos el DNI de quien recibe porque lo exige la empresa de
        envío. El costo se calcula según tu código postal al momento del checkout.
      </p>
      <ul>
        <li>El costo final se muestra en el carrito y el checkout antes de pagar.</li>
        <li>Despachamos en {businessInfo.dispatchWindow} de acreditado el pago.</li>
        <li>Recibís por email la empresa y el código de seguimiento cuando despachamos.</li>
        <li>El tiempo de tránsito depende de la empresa y de tu zona; con el código de seguimiento ves dónde está tu pedido.</li>
        <li>
          Si tu pedido se demora, se extravía o llega dañado, escribinos por <Link href="/contacto">contacto</Link>: lo
          gestionamos con la empresa de envío y, si corresponde, lo reponemos o te devolvemos el dinero.
        </li>
      </ul>

      {/* Umbral 0 = sin envío gratis: no decir "gratis desde $0". */}
      {threshold > 0 && (
        <>
          <h2>Envío gratis</h2>
          <p>
            Tenés <strong>envío gratis</strong> en compras desde {formatARS(threshold)}. En el carrito te mostramos
            cuánto te falta para alcanzarlo.
          </p>
        </>
      )}

      <h2>Medios de pago</h2>
      <p>
        Aceptamos {businessInfo.paymentMethods}. El pago se procesa de forma segura con Mercado Pago;
        Glamify Makeup no almacena los datos de tu tarjeta.
      </p>

      <h2>Cambios y devoluciones</h2>
      <p>
        Podés ejercer el derecho de arrepentimiento dentro de los {businessInfo.retractionDays} días corridos desde que recibís el pedido o desde la compra, lo que ocurra último. Gestionalo desde el{" "}
        <Link href="/arrepentimiento">Botón de Arrepentimiento</Link>. El envío de la devolución corre por nuestra
        cuenta y, en cuanto lo recibimos, te reintegramos el total abonado (incluido el envío original) por el mismo medio de pago.
      </p>
      <p>
        Si un producto te llegó roto, fallado o equivocado, escribinos por <Link href="/contacto">contacto</Link> con
        una foto: elegís entre que te lo cambiemos por uno igual (si tenemos stock) o que te devolvamos el dinero, con el
        envío a nuestro cargo. Por higiene, no hacemos
        cambios por gusto fuera de esos casos y de tu derecho de arrepentimiento.
      </p>
    </Prose>
  );
}
