"use client";

import { useEffect, useRef, useState } from "react";

const changed = <T,>(prev: T, next: T) => !Object.is(prev, next);

/**
 * Contador que sube cada vez que `value` cambia después de montar (al montar no cuenta).
 * Con `key={pulse}` y `pulse > 0 && "animate-…"` re-dispara una animación corta ligada a ese cambio.
 * `when(prev, next)` filtra qué cambios cuentan (ej. solo cuando algo se completa).
 */
export function useChangePulse<T>(value: T, when: (prev: T, next: T) => boolean = changed): number {
  const prev = useRef(value);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (when(prev.current, value)) setPulse((n) => n + 1);
    prev.current = value;
  }, [value, when]);
  return pulse;
}

/** Para `useChangePulse`: cuenta solo cuando pasa de falso a verdadero. */
export const becameTrue = (prev: unknown, next: unknown) => !prev && Boolean(next);
