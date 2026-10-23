import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/legal/prose";
import { businessInfo } from "@/lib/legal/business-info";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Términos y condiciones de uso y compra en Glamify Makeup.",
};

export default function TerminosPage() {
  return (
    <Prose>
      <h1>Términos y condiciones</h1>
      <p>
        Estos términos y condiciones regulan el uso del sitio y la compra de productos en Glamify Makeup. Al navegar
        o realizar un pedido, aceptás estos términos. Podés leerlos, guardarlos o imprimirlos desde tu navegador.
        Última actualización: octubre de 2026.
      </p>

      <h2>1. Identificación del proveedor</h2>
      <ul>
        <li>Titular: {businessInfo.legalName}</li>
        <li>CUIT/CUIL: {businessInfo.taxId}</li>
        <li>Condición fiscal: {businessInfo.taxCondition}</li>
        <li>Domicilio: {businessInfo.address}</li>
        <li>Contacto y atención al consumidor: {businessInfo.email}</li>
        <li>
          WhatsApp y horarios de atención: en la página de <Link href="/contacto">contacto</Link>
        </li>
      </ul>

      <h2>2. Objeto y uso de los productos</h2>
      <p>
        Glamify Makeup comercializa maquillaje y accesorios al por menor con envíos dentro de la República
        Argentina. Las imágenes son ilustrativas; puede haber variaciones de tono según la pantalla.
      </p>
      <p>
        Antes de usar un producto, leé su rótulo (ingredientes, modo de uso y precauciones) y hacé una prueba de
        sensibilidad en una zona pequeña de la piel. Si notás irritación, enrojecimiento u otra reacción, suspendé el
        uso y consultá a un profesional de la salud.
      </p>

      <h2>3. Quién puede comprar</h2>
      <p>
        Las compras las hacen personas mayores de 18 años. Si sos menor, tiene que comprar —o autorizar la compra— una
        persona adulta responsable. Podés comprar sin crear una cuenta.
      </p>

      <h2>4. Precios y medios de pago</h2>
      <p>
        Todos los precios se expresan en pesos argentinos (ARS) e incluyen los impuestos aplicables. El costo de envío
        se suma al precio y se muestra antes de pagar. Medios de pago: {businessInfo.paymentMethods}. El pago se
        procesa a través de Mercado Pago; Glamify Makeup no almacena datos de tu tarjeta.
      </p>

      <h2>5. Formación del contrato</h2>
      <p>
        Antes de pagar podés revisar y corregir los datos y el contenido de tu pedido. El pedido queda confirmado una
        vez acreditado el pago, y te enviamos un email de confirmación. Si no podemos cumplir un pedido por falta de
        stock, te avisamos y te reintegramos el importe completo por el mismo medio de pago, sin perjuicio de los
        derechos que te reconoce el art. 10 bis de la Ley 24.240.
      </p>

      <h2>6. Envíos</h2>
      <p>
        Las condiciones y plazos de envío se detallan en <Link href="/envios-y-pagos">Envíos y pagos</Link>. Si tu
        pedido se demora, se extravía o llega dañado, escribinos por <Link href="/contacto">contacto</Link>: lo
        gestionamos con la empresa de envío y, si corresponde, lo reponemos o te devolvemos el dinero.
      </p>

      <h2>7. Derecho de arrepentimiento</h2>
      <p>
        Podés revocar tu compra, sin dar explicaciones, dentro de los {businessInfo.retractionDays} días corridos desde
        que recibís el pedido o desde la compra, lo que ocurra último (art. 34 de la Ley 24.240 y art. 1110 del Código
        Civil y Comercial). Ejercé este derecho desde el <Link href="/arrepentimiento">Botón de Arrepentimiento</Link>:
        te damos un número de constancia.
      </p>
      <p>
        Los gastos de devolución del producto corren por nuestra cuenta y, en cuanto lo recibimos, te reintegramos el
        total abonado, incluido el envío original, por el mismo medio de pago con el que pagaste. Por higiene, pedimos
        que el producto vuelva sin uso y en su envase original; si ya lo abriste, igual tenés derecho al reintegro:
        escribinos para coordinarlo. En las gift cards, el derecho se puede ejercer mientras el código no se haya
        usado: una vez usado, el valor ya se aprovechó y no se puede anular (sección 12).
      </p>

      <h2>8. Cambios, devoluciones y garantía legal</h2>
      <p>
        Los productos cuentan con la garantía legal prevista en la Ley 24.240 de Defensa del Consumidor. Si un
        producto te llegó roto, fallado o equivocado, escribinos por <Link href="/contacto">contacto</Link> con una
        foto (nos ayuda a resolverlo más rápido): elegís entre que te lo cambiemos por uno igual (si tenemos stock) o
        que te devolvamos el dinero, con el envío a nuestro cargo. Esto no limita tus derechos de los arts. 10 bis y
        17 de la Ley 24.240. Por higiene, no hacemos cambios por gusto fuera de estos casos y de tu derecho de
        arrepentimiento (sección 7).
      </p>

      <h2>9. Responsabilidad</h2>
      <p>
        Hacemos lo posible para que la información del sitio sea correcta y esté actualizada. Esta sección no limita
        los derechos que te reconoce la Ley de Defensa del Consumidor ni la responsabilidad que la ley nos asigna por
        los daños que pudiera causar un producto.
      </p>

      <h2>10. Tu cuenta</h2>
      <p>
        Si creás una cuenta (con tu email o con Google), sos responsable de cuidar tu contraseña y de que tus datos
        sean correctos. Podés pedir que eliminemos tu cuenta escribiéndonos a {businessInfo.email}.
      </p>

      <h2>11. Reseñas</h2>
      <p>
        Si publicás una reseña, mostramos junto a tu comentario el nombre que figura en tu cuenta (o el que escribas
        si no tenés cuenta) y la foto, si la subís. Las reseñas de compras verificadas se publican automáticamente y
        las demás se revisan antes. Nos autorizás a mostrarlas en el sitio mientras estén publicadas. No subas datos de
        otras personas ni contenido ofensivo o ilegal: podemos no publicar o retirar las reseñas que lo incumplan. Si
        querés que borremos una reseña tuya, escribinos a {businessInfo.email}.
      </p>

      <h2>12. Gift cards</h2>
      <p>
        Las gift cards son digitales: se envían por mail con un código al acreditarse el pago. Cada código es de un
        solo uso, vence a los 6 meses de acreditado el pago y descuenta únicamente productos: no cubre el envío ni se
        acumula con otras gift cards. Si la compra es menor al monto, el saldo no se conserva. No se canjean por
        dinero. El reembolso de una gift card solo procede si todavía no se usó; al reembolsarla, el código se anula.
      </p>

      <h2>13. Propiedad intelectual</h2>
      <p>
        Los contenidos del sitio (marca, textos, imágenes) pertenecen a Glamify Makeup o a sus titulares y no pueden
        reproducirse sin autorización.
      </p>

      <h2>14. Privacidad</h2>
      <p>
        El tratamiento de tus datos personales se rige por nuestra{" "}
        <Link href="/privacidad">Política de privacidad</Link>.
      </p>

      <h2>15. Cambios en estos términos</h2>
      <p>
        Podemos actualizar estos términos. La versión vigente es la publicada en esta página, con su fecha, y a cada
        compra se le aplican los términos vigentes al momento de hacerla.
      </p>

      <h2>16. Consultas y reclamos</h2>
      <p>
        Para consultas o reclamos escribinos a {businessInfo.email} o desde <Link href="/contacto">contacto</Link>.
        También podés presentar un reclamo ante la{" "}
        <a href={businessInfo.consumerDefenseUrl} target="_blank" rel="noopener noreferrer">
          Ventanilla Única de Defensa del Consumidor
        </a>{" "}
        o ante la Dirección de Defensa del Consumidor de tu provincia o municipio.
      </p>

      <h2>17. Jurisdicción</h2>
      <p>
        Ante cualquier controversia se aplica la legislación de la República Argentina y serán competentes los{" "}
        {businessInfo.jurisdiction}, sin perjuicio de los derechos que la normativa de consumo reconoce a la parte
        consumidora.
      </p>
    </Prose>
  );
}
