---
target: home (baseline)
total_score: 19
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\Lazar\\Documents\\github\\glamify-makeup\\.claude\\worktrees\\hola-buenas-3adff8\\src\\app\\(storefront)\\page.tsx"
target_fingerprint: "sha256:d8517116239961c3563b324a1bedee754342bbc62f6e1d505edb3039b48e5722"
target_path: "C:\\Users\\Lazar\\Documents\\github\\glamify-makeup\\.claude\\worktrees\\hola-buenas-3adff8\\src\\app\\(storefront)\\page.tsx"
timestamp: 2026-10-07T14-13-46Z
slug: src-app-storefront-page-tsx
---
- **[P1]** Producto y precio no aparecen hasta pasadas 3 pantallas en mobile (primera foto y≈2.562, primer precio y≈4.583). Las fotos de `GIFT_ITEMS.image` existen y no se renderizan.
- **[P1]** Posicionamiento ausente; claims flojos: "Los Más Elegidos" (cae a `getNewestProducts`), anuncio "superando el monto mínimo" sin cifra, "los mejores", "súper originales", "Regalo Seguro".
- **[P1]** Ergonomía mobile: chips de categoría tapados por la bottom-nav, anuncio rotativo que mueve el layout 12 px cada 4,5 s (sin pausa ni reduced-motion), ~22 % de chrome fijo, targets de 28–36 px, ~70 nodos < 14 px, logo "MAKEUP" a 8 px.
- **[P2]** Identidad genérica: negro compite con rosa como acción; 3 estilos de H2; grilla de tarjetas iguales en cada banda.
- **[P2]** Cards: 5/8 fotos de exhibidor mayorista, "Disponible" repetido, categoría ("OTROS") en lugar de marca, sin swatches.
