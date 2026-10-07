/**
 * Deploy de preview de Vercel. Comparte la DB (y puede compartir credenciales de Mercado Pago)
 * con producción, así que ahí no se cobra: un "Pagar" crearía un pedido real.
 */
export function isPreviewDeploy(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

export const PREVIEW_PAYMENTS_OFF_MESSAGE = "Esto es una vista previa: los pagos están desactivados.";
