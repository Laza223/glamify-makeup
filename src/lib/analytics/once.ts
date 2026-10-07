type KeyStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Marca `key` como emitida. true si es la primera vez (hay que emitir el evento).
 * Si el storage no está disponible (modo privado, bloqueado), devuelve true: mejor un duplicado que perder el evento.
 */
export function claimOnce(getStorage: () => KeyStorage, key: string): boolean {
  const k = `glamify_tracked:${key}`;
  try {
    const storage = getStorage();
    if (storage.getItem(k)) return false;
    storage.setItem(k, "1");
  } catch {
    /* sin storage: se emite igual */
  }
  return true;
}
