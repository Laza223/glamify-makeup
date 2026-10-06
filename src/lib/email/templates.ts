import { formatARS } from "@/lib/money";
import { appBaseUrl } from "@/lib/seo/url";
import { CORREO_TRACKING_URL } from "@/lib/shipping/tracking";

/** Escapa HTML para interpolar texto del usuario en cuerpos de email (anti-inyección). */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface OrderEmailItem {
  name: string;
  variantName?: string | null;
  qty: number;
  lineTotal: number;
}
export interface OrderEmailData {
  orderNumber: string;
  contactName: string;
  contactEmail: string;
  items: OrderEmailItem[];
  subtotal: number;
  shippingCost: number;
  discountTotal: number;
  total: number;
  shippingMethod: string;
  oversoldLines?: Array<{ name: string }>;
  /** Monto realmente acreditado por MP (para reconciliar contra `total` en la alerta a la dueña). */
  amountPaid?: number;
  /** Resultado del auto-import a MiCorreo (para avisarle a la dueña si hay que cargarlo a mano). */
  micorreoImport?: { imported: boolean; detail: string };
  /** Link de WhatsApp de la tienda para el "escribinos" del mail a la clienta (opcional). */
  whatsappUrl?: string | null;
}
export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout compartido (mismo estilo que el mail de confirmación de Supabase Auth:
// docs/email-templates/confirm-signup.html). Tablas + estilos inline para que
// rinda igual en Gmail, Outlook y apps móviles. Sin emojis (veto de diseño).
// ─────────────────────────────────────────────────────────────────────────────

const COLOR = {
  page: "#FFF5F9",
  card: "#FFFFFF",
  line: "#FFD6E8",
  text: "#6E0B3F",
  muted: "#8A4A68",
  primary: "#FF2E93",
  link: "#E01E7D",
  alertBg: "#FDECEF",
  alertLine: "#F5B5C0",
} as const;
const FONT_BODY = "Arial,Helvetica,sans-serif";
const FONT_TITLE = "Georgia,'Times New Roman',serif";

/** Fila de contenido centrada dentro de la tarjeta. */
function block(inner: string, padding = "14px 32px 0 32px", extra = ""): string {
  return `<tr><td align="center" style="padding:${padding};font-family:${FONT_BODY};font-size:16px;line-height:25px;color:${COLOR.text};${extra}">${inner}</td></tr>`;
}
/** Título principal (recibe HTML ya escapado). */
function title(html: string): string {
  return block(html, "26px 32px 0 32px", `font-family:${FONT_TITLE};font-size:26px;line-height:34px;font-weight:bold;`);
}
function paragraph(html: string): string {
  return block(html);
}
function button(href: string, label: string): string {
  return block(
    `<a href="${escapeHtml(href)}" style="display:inline-block;background-color:${COLOR.primary};color:#FFFFFF;font-family:${FONT_BODY};font-size:17px;font-weight:bold;line-height:20px;text-decoration:none;padding:16px 36px;border-radius:14px;">${label}</a>`,
    "26px 32px 0 32px",
  );
}
/** Caja de aviso (para la dueña): fondo rosado suave con borde. */
function alertBox(html: string): string {
  return `<tr><td style="padding:14px 32px 0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR.alertBg};border:1px solid ${COLOR.alertLine};border-radius:12px;"><tr><td style="padding:12px 16px;font-family:${FONT_BODY};font-size:14px;line-height:21px;color:${COLOR.text};">${html}</td></tr></table></td></tr>`;
}
/** Tabla de filas etiqueta/valor, ya con celdas HTML. */
function table(rows: string): string {
  return `<tr><td style="padding:18px 32px 0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>`;
}

/** Línea "Cualquier duda, escribinos por WhatsApp": linkeada si hay número, texto plano si no. */
function helpLine(whatsappUrl?: string | null): string {
  const action = whatsappUrl
    ? `<a href="${escapeHtml(whatsappUrl)}" style="color:${COLOR.link};font-weight:bold;">escribinos por WhatsApp</a>`
    : "escribinos por WhatsApp";
  return block(`Cualquier duda, ${action} y te ayudamos.`, "8px 32px 0 32px", `font-size:14px;color:${COLOR.muted};`);
}

function itemLabel(it: OrderEmailItem): string {
  return it.variantName ? `${it.name} — ${it.variantName}` : it.name;
}
function itemsHtml(items: OrderEmailItem[]): string {
  const rows = items
    .map(
      (it) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid ${COLOR.line};font-family:${FONT_BODY};font-size:15px;line-height:21px;color:${COLOR.text};">${escapeHtml(itemLabel(it))} <span style="color:${COLOR.muted};">× ${it.qty}</span></td><td align="right" style="padding:10px 0 10px 12px;border-bottom:1px solid ${COLOR.line};font-family:${FONT_BODY};font-size:15px;color:${COLOR.text};white-space:nowrap;">${formatARS(it.lineTotal)}</td></tr>`,
    )
    .join("");
  return table(rows);
}
function itemsText(items: OrderEmailItem[]): string {
  return items.map((it) => `- ${itemLabel(it)} × ${it.qty}: ${formatARS(it.lineTotal)}`).join("\n");
}
function totalsHtml(d: OrderEmailData): string {
  const rows: Array<readonly [string, number, boolean]> = [
    ["Subtotal", d.subtotal, false],
    ...(d.discountTotal > 0 ? ([["Descuento", -d.discountTotal, false]] as const) : []),
    ["Envío", d.shippingCost, false],
    ["Total", d.total, true],
  ];
  const html = rows
    .map(([k, v, strong]) => {
      const style = strong
        ? `padding:12px 0 0 0;font-family:${FONT_BODY};font-size:18px;font-weight:bold;color:${COLOR.primary};`
        : `padding:4px 0;font-family:${FONT_BODY};font-size:14px;color:${COLOR.muted};`;
      return `<tr><td style="${style}">${k}</td><td align="right" style="${style}">${formatARS(v)}</td></tr>`;
    })
    .join("");
  return table(html);
}
/** "domicilio" / "sucursal" → texto legible. Cualquier otro valor se muestra escapado. */
function shippingLabel(method: string): string {
  if (method === "domicilio") return "a domicilio";
  if (method === "sucursal") return "a sucursal de Correo Argentino";
  return escapeHtml(method);
}

/** Envuelve el contenido en la tarjeta con logo, pie y preheader oculto. */
function layout(opts: { preheader: string; title: string; body: string; footer: string }): string {
  const logo = `${appBaseUrl()}/images/email-logo.png`;
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(opts.title)}</title></head>
<body style="margin:0;padding:0;background-color:${COLOR.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COLOR.page};">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR.page};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:${COLOR.card};border-radius:16px;border:1px solid ${COLOR.line};">
<tr><td align="center" style="padding:32px 32px 8px 32px;"><img src="${escapeHtml(logo)}" width="220" alt="Glamify Makeup" style="display:block;width:220px;max-width:100%;height:auto;border:0;" /></td></tr>
<tr><td align="center" style="padding:8px 32px 0 32px;"><div style="height:3px;width:56px;background-color:${COLOR.primary};border-radius:3px;line-height:3px;font-size:3px;">&nbsp;</div></td></tr>
${opts.body}
<tr><td style="padding:28px 32px 0 32px;"><div style="border-top:1px solid ${COLOR.line};line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
<tr><td align="center" style="padding:18px 32px 32px 32px;font-family:${FONT_BODY};font-size:12px;line-height:18px;color:${COLOR.muted};">${opts.footer}<br /><br />Glamify Makeup &middot; Luján, Buenos Aires, Argentina &middot; Envíos a todo el país</td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}

const FOOTER_CUSTOMER = "Recibís este mensaje por tu compra en glamifymakeup.site.";
const FOOTER_INTERNAL = "Aviso interno para la dueña de Glamify Makeup.";

/** Email de confirmación a la clienta. */
export function orderConfirmationEmail(d: OrderEmailData): EmailContent {
  const subject = `¡Gracias por tu compra! Pedido ${d.orderNumber} — Glamify Makeup`;
  const html = layout({
    preheader: `Recibimos tu pedido ${d.orderNumber}. Te avisamos cuando lo despachemos.`,
    title: "Gracias por tu compra",
    footer: FOOTER_CUSTOMER,
    body: [
      title(`¡Gracias, ${escapeHtml(d.contactName)}!`),
      paragraph(`Recibimos tu pedido <strong>${escapeHtml(d.orderNumber)}</strong>. Te avisamos por mail apenas lo despachemos.`),
      itemsHtml(d.items),
      totalsHtml(d),
      paragraph(`Envío ${shippingLabel(d.shippingMethod)}.`),
      helpLine(d.whatsappUrl),
    ].join("\n"),
  });
  const text = `¡Gracias, ${d.contactName}!\nPedido ${d.orderNumber}\n\n${itemsText(d.items)}\n\nSubtotal: ${formatARS(d.subtotal)}\nDescuento: ${formatARS(d.discountTotal)}\nEnvío: ${formatARS(d.shippingCost)}\nTotal: ${formatARS(d.total)}\nEnvío: ${d.shippingMethod}${d.whatsappUrl ? `\n\nDudas por WhatsApp: ${d.whatsappUrl}` : ""}`;
  return { subject, html, text };
}

/** Email de alerta a la dueña (nuevo pedido pagado), con alerta de oversell si corresponde. */
export function newOrderAlertEmail(d: OrderEmailData): EmailContent {
  const oversell = d.oversoldLines && d.oversoldLines.length > 0;
  const amountMismatch = d.amountPaid != null && Math.abs(d.amountPaid - d.total) > 0.01;
  // Sólo cuenta como "no cargado" si sabemos el resultado y fue negativo. Sin dato → no alarmar.
  const notImported = d.micorreoImport != null && !d.micorreoImport.imported;
  const needsReview = oversell || amountMismatch || notImported;
  const subject = needsReview
    ? `Nuevo pedido ${d.orderNumber} — REVISAR`
    : `Nuevo pedido pagado ${d.orderNumber} (${formatARS(d.total)})`;
  const oversellHtml = oversell
    ? alertBox(
        `<strong>Oversell:</strong> sin stock suficiente para:<ul style="margin:6px 0 6px 18px;padding:0;">${d.oversoldLines!.map((l) => `<li>${escapeHtml(l.name)}</li>`).join("")}</ul>Coordinar con la clienta por WhatsApp.`,
      )
    : "";
  const amountHtml = amountMismatch
    ? alertBox(
        `<strong>Monto:</strong> MP acreditó ${formatARS(d.amountPaid!)} pero el total del pedido es ${formatARS(d.total)}. Revisar antes de despachar.`,
      )
    : "";
  const importHtml = notImported
    ? alertBox(
        `<strong>MiCorreo:</strong> este envío <strong>NO se cargó solo</strong> (${escapeHtml(d.micorreoImport!.detail)}). Entrá al pedido en el panel y tocá "Reintentar carga en MiCorreo", o cargalo a mano.`,
      )
    : "";
  const html = layout({
    preheader: `${d.orderNumber} · ${formatARS(d.total)} · ${d.contactName}`,
    title: `Nuevo pedido ${d.orderNumber}`,
    footer: FOOTER_INTERNAL,
    body: [
      title(`Nuevo pedido ${escapeHtml(d.orderNumber)}`),
      oversellHtml,
      amountHtml,
      importHtml,
      paragraph(`<strong>${escapeHtml(d.contactName)}</strong><br /><a href="mailto:${escapeHtml(d.contactEmail)}" style="color:${COLOR.link};">${escapeHtml(d.contactEmail)}</a>`),
      itemsHtml(d.items),
      totalsHtml(d),
      paragraph(`Envío ${shippingLabel(d.shippingMethod)}.`),
    ].join("\n"),
  });
  const text = `Nuevo pedido ${d.orderNumber}\nCliente: ${d.contactName} (${d.contactEmail})\nTotal: ${formatARS(d.total)}${oversell ? `\nOVERSELL: ${d.oversoldLines!.map((l) => l.name).join(", ")}` : ""}${amountMismatch ? `\nMONTO: acreditado ${formatARS(d.amountPaid!)} ≠ total ${formatARS(d.total)}` : ""}${notImported ? `\nMiCorreo NO cargó solo: ${d.micorreoImport!.detail}` : ""}`;
  return { subject, html, text };
}

export interface DispatchEmailData {
  /** Página de seguimiento de la tienda (`/seguimiento/<id>`); sin ella, la de Correo. */
  trackingUrl?: string | null;
  orderNumber: string;
  contactName: string;
  trackingNumber: string;
  /** Servicio de envío (ej. "Correo Argentino Clásico"), opcional. */
  service?: string | null;
  /** Link de WhatsApp de la tienda (opcional). */
  whatsappUrl?: string | null;
}

/**
 * Email a la clienta cuando su pedido se despacha (la dueña cargó el tracking).
 * Cumple la promesa publicada en el sitio ("recibís el número de seguimiento por email").
 * Linkea la página de rastreo de Correo Argentino y muestra el número para pegar.
 */
export function shipmentDispatchedEmail(d: DispatchEmailData): EmailContent {
  const subject = `¡Tu pedido ${d.orderNumber} está en camino! — Glamify Makeup`;
  const svc = d.service ? ` por ${escapeHtml(d.service)}` : "";
  const html = layout({
    preheader: `Tu número de seguimiento es ${d.trackingNumber}.`,
    title: "Tu pedido está en camino",
    footer: FOOTER_CUSTOMER,
    body: [
      title(`¡Ya salió, ${escapeHtml(d.contactName)}!`),
      paragraph(`Despachamos tu pedido <strong>${escapeHtml(d.orderNumber)}</strong>${svc}.`),
      block("Tu número de seguimiento es", "20px 32px 0 32px", `font-size:14px;color:${COLOR.muted};`),
      `<tr><td align="center" style="padding:8px 32px 0 32px;"><table role="presentation" cellpadding="0" cellspacing="0" style="background-color:${COLOR.page};border:1px solid ${COLOR.line};border-radius:12px;"><tr><td style="padding:12px 22px;font-family:${FONT_BODY};font-size:20px;font-weight:bold;letter-spacing:1px;color:${COLOR.primary};">${escapeHtml(d.trackingNumber)}</td></tr></table></td></tr>`,
      button(d.trackingUrl ?? CORREO_TRACKING_URL, "Seguir mi envío"),
      block(
        d.trackingUrl
          ? "Ahí ves el estado de tu envío; se actualiza solo con lo que informa Correo. Los primeros movimientos pueden tardar hasta 24 h."
          : "Pegá ese número en la página de Correo Argentino. Puede tardar hasta 24 h en aparecer.", "16px 32px 0 32px", `font-size:13px;line-height:20px;color:${COLOR.muted};`),
      helpLine(d.whatsappUrl),
    ].join("\n"),
  });
  const text = `¡Ya salió, ${d.contactName}!\nDespachamos tu pedido ${d.orderNumber}${d.service ? ` por ${d.service}` : ""}.\n\nSeguimiento: ${d.trackingNumber}\nSeguilo en ${d.trackingUrl ?? CORREO_TRACKING_URL} (puede tardar hasta 24 h en aparecer).${d.whatsappUrl ? `\nDudas por WhatsApp: ${d.whatsappUrl}` : ""}`;
  return { subject, html, text };
}

export interface AbandonedCartEmailData {
  name?: string | null;
  items: OrderEmailItem[];
  recoverUrl: string;
}

/** Email de recupero de carrito abandonado (un único recordatorio a 24h). */
export function abandonedCartEmail(d: AbandonedCartEmailData): EmailContent {
  const hi = d.name ? `${d.name}, ` : "";
  const subject = "Te quedó algo en el carrito — Glamify Makeup";
  const html = layout({
    preheader: "Guardamos tu carrito para que lo termines cuando quieras.",
    title: "Te quedó algo en el carrito",
    footer: "Si ya compraste o no te interesa, ignorá este mensaje.",
    body: [
      title(`${escapeHtml(hi)}¿lo dejamos para después?`),
      paragraph("Guardamos tu carrito. Estos productos te están esperando:"),
      itemsHtml(d.items),
      button(d.recoverUrl, "Volver a mi carrito"),
    ].join("\n"),
  });
  const text = `${hi}te quedó algo en el carrito:\n\n${itemsText(d.items)}\n\nVolvé a tu carrito: ${d.recoverUrl}`;
  return { subject, html, text };
}

export interface RetractionEmailData {
  ticket: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  orderNumber?: string | null;
  reason?: string | null;
}

/** Alerta a la dueña: nueva solicitud del Botón de Arrepentimiento (Res. 424/2020). */
export function retractionAlertEmail(d: RetractionEmailData): EmailContent {
  const subject = `Solicitud de arrepentimiento ${d.ticket}`;
  const row = (k: string, v?: string | null) =>
    v
      ? `<tr><td valign="top" style="padding:8px 12px 8px 0;border-bottom:1px solid ${COLOR.line};font-family:${FONT_BODY};font-size:14px;font-weight:bold;color:${COLOR.muted};white-space:nowrap;">${k}</td><td style="padding:8px 0;border-bottom:1px solid ${COLOR.line};font-family:${FONT_BODY};font-size:14px;line-height:21px;color:${COLOR.text};">${escapeHtml(v)}</td></tr>`
      : "";
  const html = layout({
    preheader: `${d.ticket} · ${d.contactName}`,
    title: `Solicitud de arrepentimiento ${d.ticket}`,
    footer: FOOTER_INTERNAL,
    body: [
      title(`Solicitud de arrepentimiento ${escapeHtml(d.ticket)}`),
      paragraph("Un/a consumidor/a ejerció el derecho de arrepentimiento (art. 34 Ley 24.240). Contactalo/a para coordinar la devolución y el reintegro."),
      table(
        [row("Nombre", d.contactName), row("Email", d.contactEmail), row("Teléfono", d.contactPhone), row("Pedido", d.orderNumber), row("Motivo", d.reason)].join(""),
      ),
    ].join("\n"),
  });
  const text = `Solicitud de arrepentimiento ${d.ticket}\nNombre: ${d.contactName}\nEmail: ${d.contactEmail}\nTeléfono: ${d.contactPhone ?? "-"}\nPedido: ${d.orderNumber ?? "-"}\nMotivo: ${d.reason ?? "-"}`;
  return { subject, html, text };
}

export interface RetractionReceiptData {
  ticket: string;
  date: string;
  contactName: string;
  /** Link de WhatsApp de la tienda (opcional). */
  whatsappUrl?: string | null;
}

/** Constancia al consumidor: comprobante del ejercicio del derecho de arrepentimiento. */
export function retractionReceiptEmail(d: RetractionReceiptData): EmailContent {
  const name = escapeHtml(d.contactName);
  const subject = `Constancia de arrepentimiento ${d.ticket} — Glamify Makeup`;
  const html = layout({
    preheader: `Constancia ${d.ticket}. Guardá este correo como comprobante.`,
    title: "Constancia de arrepentimiento",
    footer: "Guardá este correo como comprobante de tu solicitud.",
    body: [
      title("Recibimos tu solicitud"),
      paragraph(`Hola ${name}, registramos tu solicitud de arrepentimiento.`),
      `<tr><td align="center" style="padding:18px 32px 0 32px;"><table role="presentation" cellpadding="0" cellspacing="0" style="background-color:${COLOR.page};border:1px solid ${COLOR.line};border-radius:12px;"><tr><td align="center" style="padding:14px 28px;font-family:${FONT_BODY};font-size:14px;line-height:22px;color:${COLOR.muted};">Constancia<br /><span style="font-size:20px;font-weight:bold;letter-spacing:1px;color:${COLOR.primary};">${escapeHtml(d.ticket)}</span><br />${escapeHtml(d.date)}</td></tr></table></td></tr>`,
      paragraph("Te vamos a contactar para coordinar la devolución del producto y el reintegro del importe."),
      helpLine(d.whatsappUrl),
    ].join("\n"),
  });
  const text = `Recibimos tu solicitud de arrepentimiento.\nConstancia: ${d.ticket}\nFecha: ${d.date}\nTe contactaremos para coordinar la devolución y el reintegro. Guardá este correo como comprobante.${d.whatsappUrl ? `\nDudas por WhatsApp: ${d.whatsappUrl}` : ""}`;
  return { subject, html, text };
}

export interface AwaitingPickupEmailData {
  /** Página de seguimiento de la tienda; sin ella, la de Correo. */
  trackingUrl?: string | null;
  orderNumber: string;
  contactName: string;
  trackingNumber: string;
  /** Sucursal / planta donde quedó el paquete, según Correo. */
  facility: string | null;
  whatsappUrl?: string | null;
}

/** Email a la clienta: Correo intentó entregar y el paquete quedó en la sucursal para retirar. */
export function shipmentAwaitingPickupEmail(d: AwaitingPickupEmailData): EmailContent {
  const subject = `Tu pedido ${d.orderNumber} te espera en la sucursal — Glamify Makeup`;
  const where = d.facility ? ` en <strong>${escapeHtml(d.facility)}</strong>` : " en la sucursal de Correo";
  const html = layout({
    preheader: `Correo intentó entregar tu pedido ${d.orderNumber}. Retiralo en la sucursal.`,
    title: "Tu pedido te espera en la sucursal",
    footer: FOOTER_CUSTOMER,
    body: [
      title(`¡Hola, ${escapeHtml(d.contactName)}!`),
      paragraph(`Correo Argentino intentó entregarte el pedido <strong>${escapeHtml(d.orderNumber)}</strong> y lo dejó${where} para que lo retires.`),
      paragraph(`Llevá tu DNI y el número de seguimiento <strong>${escapeHtml(d.trackingNumber)}</strong>. Si no se retira a tiempo, Correo lo devuelve.`),
      button(d.trackingUrl ?? CORREO_TRACKING_URL, "Ver dónde está"),
      helpLine(d.whatsappUrl),
    ].join("\n"),
  });
  const text = `¡Hola, ${d.contactName}! Correo intentó entregarte el pedido ${d.orderNumber} y lo dejó ${d.facility ? `en ${d.facility}` : "en la sucursal"} para que lo retires. Llevá tu DNI y el seguimiento ${d.trackingNumber}. Si no se retira a tiempo, Correo lo devuelve.\nSeguimiento: ${d.trackingUrl ?? CORREO_TRACKING_URL}${d.whatsappUrl ? `\nDudas por WhatsApp: ${d.whatsappUrl}` : ""}`;
  return { subject, html, text };
}

export interface DeliveredEmailData {
  orderNumber: string;
  contactName: string;
  /** Link para dejar reseña (sólo si la clienta tiene cuenta). */
  reviewUrl?: string | null;
  whatsappUrl?: string | null;
}

/** Email a la clienta cuando Correo informa el pedido entregado. */
export function shipmentDeliveredEmail(d: DeliveredEmailData): EmailContent {
  const subject = `¡Tu pedido ${d.orderNumber} llegó! — Glamify Makeup`;
  const html = layout({
    preheader: `Correo nos avisó que tu pedido ${d.orderNumber} fue entregado.`,
    title: "Tu pedido llegó",
    footer: FOOTER_CUSTOMER,
    body: [
      title(`¡Llegó, ${escapeHtml(d.contactName)}!`),
      paragraph(`Correo Argentino nos avisó que tu pedido <strong>${escapeHtml(d.orderNumber)}</strong> fue entregado. Esperamos que lo disfrutes.`),
      ...(d.reviewUrl
        ? [paragraph("¿Nos contás qué te pareció? Tu reseña ayuda a otras chicas a elegir."), button(d.reviewUrl, "Dejar una reseña")]
        : []),
      helpLine(d.whatsappUrl),
    ].join("\n"),
  });
  const text = `¡Llegó, ${d.contactName}! Correo nos avisó que tu pedido ${d.orderNumber} fue entregado.${d.reviewUrl ? `\nDejá tu reseña: ${d.reviewUrl}` : ""}${d.whatsappUrl ? `\nDudas por WhatsApp: ${d.whatsappUrl}` : ""}`;
  return { subject, html, text };
}

export interface ReturnedAlertEmailData {
  orderNumber: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  trackingNumber: string;
  lastEvent: string | null;
}

/** Alerta a la dueña: Correo informa que el paquete vuelve al remitente. */
export function shipmentReturnedAlertEmail(d: ReturnedAlertEmailData): EmailContent {
  const subject = `Envío devuelto: pedido ${d.orderNumber} — REVISAR`;
  const html = layout({
    preheader: `Correo devuelve el paquete del pedido ${d.orderNumber}.`,
    title: `Envío devuelto ${d.orderNumber}`,
    footer: FOOTER_INTERNAL,
    body: [
      title(`Envío devuelto · ${escapeHtml(d.orderNumber)}`),
      alertBox(
        `Correo informa que el paquete <strong>vuelve al remitente</strong>${d.lastEvent ? ` (${escapeHtml(d.lastEvent)})` : ""}. Contactá a la clienta para reenviarlo o coordinar el reintegro.`,
      ),
      paragraph(
        `<strong>${escapeHtml(d.contactName)}</strong><br /><a href="mailto:${escapeHtml(d.contactEmail)}" style="color:${COLOR.link};">${escapeHtml(d.contactEmail)}</a>${d.contactPhone ? `<br />${escapeHtml(d.contactPhone)}` : ""}<br />Seguimiento: ${escapeHtml(d.trackingNumber)}`,
      ),
    ].join("\n"),
  });
  const text = `Envío devuelto: pedido ${d.orderNumber}\nCliente: ${d.contactName} (${d.contactEmail}${d.contactPhone ? `, ${d.contactPhone}` : ""})\nSeguimiento: ${d.trackingNumber}${d.lastEvent ? `\nÚltimo movimiento: ${d.lastEvent}` : ""}`;
  return { subject, html, text };
}
