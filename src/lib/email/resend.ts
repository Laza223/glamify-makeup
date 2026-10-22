export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}
export interface SendEmailDeps {
  fetch?: typeof fetch;
  apiKey?: string;
  defaultFrom?: string;
  replyTo?: string;
}
export interface SendEmailResult {
  id: string | null;
  logged: boolean;
}

const RESEND_API = "https://api.resend.com/emails";

/** Envía un email por Resend; si no hay API key, lo loguea (transport de dev). */
export async function sendEmail(input: SendEmailInput, deps: SendEmailDeps = {}): Promise<SendEmailResult> {
  const apiKey = deps.apiKey ?? process.env.RESEND_API_KEY ?? "";
  const configuredFrom = input.from ?? deps.defaultFrom ?? process.env.RESEND_FROM;
  const from = configuredFrom ?? "Glamify Makeup <onboarding@resend.dev>";
  // El remitente de prueba de Resend solo entrega a la cuenta dueña: en producción es un fallo silencioso.
  if (!configuredFrom && process.env.VERCEL_ENV === "production") {
    console.error(`RESEND_FROM no configurada: se usa onboarding@resend.dev (solo entrega a la cuenta dueña) para "${input.subject}"`);
  }

  if (!apiKey) {
    // En producción la clienta NO recibe el mail: que se vea como error en los logs de Vercel.
    if (process.env.VERCEL_ENV === "production") console.error(`RESEND_API_KEY no configurada: no se envió "${input.subject}"`);
    console.info(`📧 [dev email] → ${input.to} | ${input.subject}\n${input.text ?? input.html}`);
    return { id: null, logged: true };
  }
  // Trim: un espacio o un salto de línea al pegar la variable en Vercel haría rechazar TODOS los mails.
  const replyTo = (deps.replyTo ?? process.env.RESEND_REPLY_TO)?.trim();
  const fetchFn = deps.fetch ?? fetch;
  const res = await fetchFn(RESEND_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: input.to, subject: input.subject, html: input.html, text: input.text, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) throw new Error(`Resend falló: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { id: string };
  return { id: body.id, logged: false };
}
