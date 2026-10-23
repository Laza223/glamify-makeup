import type { Metadata } from "next";
import { Prose } from "@/components/legal/prose";
import { businessInfo } from "@/lib/legal/business-info";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo Glamify Makeup trata y protege tus datos personales (Ley 25.326).",
};

export default function PrivacidadPage() {
  return (
    <Prose>
      <h1>Política de privacidad</h1>
      <p>
        En Glamify Makeup protegemos tus datos personales conforme a la Ley 25.326 de Protección de los Datos
        Personales. Esta política explica qué datos recolectamos, con qué fin y cuáles son tus derechos. Última
        actualización: octubre de 2026.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li>Titular: {businessInfo.legalName}</li>
        <li>CUIT/CUIL: {businessInfo.taxId}</li>
        <li>Domicilio: {businessInfo.address}</li>
        <li>Contacto: {businessInfo.email}</li>
      </ul>

      <h2>2. Datos que recolectamos</h2>
      <ul>
        <li>Datos de contacto: nombre, email, teléfono.</li>
        <li>
          Datos de pedido y envío: dirección, localidad, código postal, notas de entrega y, en los envíos, el DNI de
          quien recibe (lo pide la empresa de envío para entregar el paquete; no lo usamos para nada más).
        </li>
        <li>
          Si creás una cuenta: tu email y tus direcciones y favoritos guardados. Tu contraseña la gestiona nuestro
          proveedor de autenticación y nosotras no la vemos; si ingresás con Google, recibimos tu nombre y tu email.
        </li>
        <li>
          Si publicás una reseña: el nombre que mostramos, tu comentario y la foto, si la subís (los dos últimos son
          públicos).
        </li>
        <li>
          Si usás el Botón de Arrepentimiento: nombre, email, teléfono, número de pedido y motivo, si los completás.
        </li>
        <li>
          Si dejás tu email para el cupón de bienvenida o para recibir recordatorios de tu carrito: ese email y el
          contenido de tu carrito.
        </li>
        <li>
          Datos de navegación: páginas vistas y eventos de uso (analítica), asociados a un identificador anónimo de
          visitante y a tu dirección IP aproximada, no a tu nombre ni a tu email.
        </li>
      </ul>
      <p>No recolectamos ni almacenamos datos de tarjetas: el pago lo procesa Mercado Pago.</p>

      <h2>3. Finalidad</h2>
      <p>
        Usamos tus datos para procesar pedidos y envíos, gestionar devoluciones y arrepentimientos, brindar soporte,
        mostrar reseñas, medir y mejorar el uso del sitio, cumplir obligaciones legales y —si lo consentís— enviarte
        comunicaciones de marketing y recuperar carritos.
      </p>

      <h2>4. Base legal y consentimiento</h2>
      <p>
        El tratamiento se basa en la ejecución del contrato de compra, en el cumplimiento de obligaciones legales y en
        tu consentimiento para las comunicaciones comerciales y los recordatorios de carrito. Lo das al tildar la casilla
        correspondiente al registrarte o al dejar tu email en el cupón de bienvenida. Podés retirarlo en cualquier
        momento (sección 9). La analítica de uso viene activada por defecto y podés desactivarla (sección 10).
      </p>

      <h2>5. Destinatarios</h2>
      <p>
        Compartimos datos solo con proveedores necesarios para operar: Mercado Pago (pagos; recibe tu email), Correo
        Argentino, Andreani, OCA, Vía Cargo u otro operador logístico (envíos), Resend (emails), Supabase y Vercel
        (infraestructura y autenticación), Google (si ingresás con tu cuenta de Google) y PostHog (analítica). No
        vendemos tus datos a terceros.
      </p>

      <h2>6. Transferencias internacionales</h2>
      <p>
        Algunos de estos proveedores pueden almacenar o procesar datos fuera de la Argentina, por ejemplo en Brasil o
        en Estados Unidos, en países que pueden no tener un nivel de protección equivalente al argentino. Esas
        transferencias son necesarias para prestar el servicio. Al aceptar esta política —en el checkout o al crear tu
        cuenta— consentís esas transferencias. Si no estás de acuerdo, escribinos antes de comprar.
      </p>

      <h2>7. Tus derechos (ARCO)</h2>
      <p>
        Tenés derecho a acceder, rectificar, actualizar y suprimir tus datos. Para ejercerlos, escribinos a{" "}
        {businessInfo.email}; antes de responder verificamos tu identidad. El acceso es gratuito a intervalos no
        inferiores a seis meses (art. 14, inc. 3, Ley 25.326). El responsable debe responder el pedido de acceso
        dentro de los <strong>10 días corridos</strong> (art. 14) y la rectificación o supresión dentro de los{" "}
        <strong>5 días hábiles</strong> (art. 16).
      </p>

      <h2>8. Conservación</h2>
      <p>
        Conservamos los datos mientras dure la relación comercial y durante los plazos legales aplicables: la
        documentación de las ventas, por ejemplo, la guardamos hasta 10 años por obligaciones contables y fiscales. Los
        datos que no estén sujetos a una obligación legal (tu cuenta, direcciones guardadas, carritos, reseñas) los
        borramos cuando nos lo pedís.
      </p>

      <h2>9. Baja de comunicaciones</h2>
      <p>
        Podés pedir la baja de los emails de marketing y de los recordatorios de carrito en cualquier momento
        escribiéndonos a {businessInfo.email} o por WhatsApp, y te damos de baja.
      </p>

      <h2>10. Cookies y analítica</h2>
      <p>
        Usamos cookies propias necesarias para que la tienda funcione: tu carrito y el cupón aplicado (hasta 30 días),
        tu sesión si ingresás a tu cuenta, y la elección que hagas en el banner. Además usamos analítica (PostHog),
        que guarda en tu navegador (cookie o almacenamiento local) un identificador anónimo de visitante y viene
        activada por defecto. Podés rechazarla desde el banner de la tienda; la decisión se guarda en tu
        navegador y se respeta en todo el sitio. Como el banner no aparece durante el pago, si querés que no midamos tu
        navegación rechazalo en otra página de la tienda o escribinos.
      </p>

      <h2>11. Menores de edad</h2>
      <p>
        El sitio está pensado para mayores de 18 años. Si sos menor, comprá y dejá tus datos con la autorización de una
        persona adulta responsable.
      </p>

      <h2>12. Autoridad de control</h2>
      <p>
        La{" "}
        <a href="https://www.argentina.gob.ar/aaip" target="_blank" rel="noopener noreferrer">
          Agencia de Acceso a la Información Pública (AAIP)
        </a>
        , órgano de control de la Ley 25.326, tiene la atribución de atender denuncias y reclamos respecto del
        incumplimiento de las normas sobre protección de datos personales. Para consultas sobre tus datos,
        escribinos a {businessInfo.email}.
      </p>
    </Prose>
  );
}
