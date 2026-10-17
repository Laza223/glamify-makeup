/** Resultado estándar de un Server Action (mismo shape que (storefront)/actions.ts). */
export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Para la UI: una action que tira (red caída, 413, error del server) cuenta como `{ ok: false }`,
 * así el formulario muestra su mensaje genérico en vez de quedar trabado en "Enviando…".
 * Un `redirect()` de la action no rechaza: resuelve `undefined` mientras el router navega.
 */
export function settleAction<T extends ActionResult>(promise: Promise<T>): Promise<T> {
  const failed = { ok: false } as T;
  return promise.then(
    (r) => r ?? failed,
    () => failed,
  );
}
