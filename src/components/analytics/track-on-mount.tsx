"use client";

import { useEffect, useRef } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics/track";
import { claimOnce } from "@/lib/analytics/once";

/**
 * Dispara un evento de analytics una sola vez al montar (para usar desde Server Components).
 * Con `onceKey`, tampoco se repite al recargar ni al volver a la página (ej. `purchase` por número de pedido).
 */
export function TrackOnMount({
  event,
  props,
  onceKey,
}: {
  event: AnalyticsEvent;
  props?: Record<string, unknown>;
  onceKey?: string;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (onceKey && !claimOnce(() => window.localStorage, `${event}:${onceKey}`)) return;
    track(event, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
