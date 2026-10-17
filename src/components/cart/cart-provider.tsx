"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { setVariantQtyAction } from "@/app/(storefront)/actions";
import { track } from "@/lib/analytics/track";

export interface CartItemState {
  id?: string;
  refId: string;
  productId?: string | null;
  qty: number;
}

export interface CartUI {
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
  setOpen: (v: boolean) => void;
  cartCount: number;
  getVariantQty: (variantId: string) => number;
  getProductQty: (productId: string) => number;
  setVariantQty: (
    variantId: string,
    nextQty: number,
    productId?: string | null,
  ) => Promise<boolean>;
  isUpdating: (variantId: string) => boolean;
  /** Mensaje para la clienta si el último intento sobre esa variante falló (null si no hay). */
  getError: (variantId: string) => string | null;
}

const UPDATE_ERROR = "No pudimos actualizar tu carrito. Probá de nuevo.";

const CartContext = createContext<CartUI | null>(null);

function buildItemsMap(lines?: CartItemState[]): Record<string, CartItemState> {
  const map: Record<string, CartItemState> = {};
  if (!lines) return map;
  for (const line of lines) {
    map[line.refId] = line;
  }
  return map;
}

export function CartProvider({
  children,
  initialLines = [],
  initialCount = 0,
}: {
  children: ReactNode;
  initialLines?: CartItemState[];
  initialCount?: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Record<string, CartItemState>>(() =>
    buildItemsMap(initialLines),
  );
  const [optimisticCount, setOptimisticCount] = useState(initialCount);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sincronizar cuando el servidor revalida los datos (router.refresh o navegación)
  useEffect(() => {
    setItems(buildItemsMap(initialLines));
    setOptimisticCount(initialCount);
  }, [initialLines, initialCount]);

  const getVariantQty = useCallback(
    (variantId: string): number => {
      return items[variantId]?.qty ?? 0;
    },
    [items],
  );

  const getProductQty = useCallback(
    (productId: string): number => {
      let total = 0;
      for (const key in items) {
        if (items[key]?.productId === productId) {
          total += items[key].qty;
        }
      }
      return total;
    },
    [items],
  );

  const isUpdating = useCallback(
    (variantId: string): boolean => {
      return pendingIds.has(variantId);
    },
    [pendingIds],
  );

  const getError = useCallback((variantId: string): string | null => errors[variantId] ?? null, [errors]);

  const setError = useCallback((variantId: string, message: string | null) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (message === null) delete next[variantId];
      else next[variantId] = message;
      return next;
    });
  }, []);

  const setVariantQty = useCallback(
    async (
      variantId: string,
      nextQty: number,
      productId?: string | null,
    ): Promise<boolean> => {
      const clampedQty = Math.max(0, nextQty);
      const prevItem = items[variantId];
      const prevQty = prevItem?.qty ?? 0;
      if (prevQty === clampedQty) return true;

      const diff = clampedQty - prevQty;
      setError(variantId, null);

      // Vuelve al estado previo si el server no pudo aplicar el cambio.
      const revert = (message: string) => {
        setItems((prev) => {
          const next = { ...prev };
          if (prevQty <= 0) {
            delete next[variantId];
          } else {
            next[variantId] = {
              id: prevItem?.id,
              refId: variantId,
              productId: productId ?? prevItem?.productId ?? null,
              qty: prevQty,
            };
          }
          return next;
        });
        setOptimisticCount((prev) => Math.max(0, prev - diff));
        setError(variantId, message);
      };

      // Actualización optimista inmediata (0ms lag visual)
      setItems((prev) => {
        const next = { ...prev };
        if (clampedQty <= 0) {
          delete next[variantId];
        } else {
          next[variantId] = {
            id: prev[variantId]?.id,
            refId: variantId,
            productId: productId ?? prev[variantId]?.productId ?? null,
            qty: clampedQty,
          };
        }
        return next;
      });
      setOptimisticCount((prev) => Math.max(0, prev + diff));
      setPendingIds((prev) => new Set(prev).add(variantId));

      try {
        const res = await setVariantQtyAction({ variantId, qty: clampedQty });
        if (!res.ok) {
          revert(res.error ?? UPDATE_ERROR);
          return false;
        }

        // Steppers y selector rápido de las tarjetas: solo las subidas cuentan como add_to_cart.
        if (diff > 0) track("add_to_cart", { variantId, qty: diff, productId, source: "quick" });

        startTransition(() => {
          router.refresh();
        });
        return true;
      } catch {
        revert(UPDATE_ERROR);
        return false;
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(variantId);
          return next;
        });
      }
    },
    [items, router, setError],
  );

  return (
    <CartContext.Provider
      value={{
        open,
        openCart: () => setOpen(true),
        closeCart: () => setOpen(false),
        setOpen,
        cartCount: optimisticCount,
        getVariantQty,
        getProductQty,
        setVariantQty,
        isUpdating,
        getError,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCartUI(): CartUI {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartUI debe usarse dentro de CartProvider");
  return ctx;
}
