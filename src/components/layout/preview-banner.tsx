import { isPreviewDeploy } from "@/lib/http/deploy-env";

/** Aviso en los previews de Vercel: se puede recorrer todo, pero no se cobra. */
export function PreviewBanner() {
  if (!isPreviewDeploy()) return null;
  return (
    <p role="status" className="bg-foreground px-4 py-1.5 text-center text-xs font-semibold text-background">
      Vista previa del sitio: podés recorrer todo, pero los pagos están desactivados.
    </p>
  );
}
