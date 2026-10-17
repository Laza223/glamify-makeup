import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/customer/auth";
import { PageTitle } from "@/components/ui/page-title";
import { sanitizeNext } from "@/lib/auth/safe-next";
import { IngresarForm } from "./ingresar-form";

export const metadata: Metadata = { title: "Ingresar" };

interface IngresarPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function IngresarPage({ searchParams }: IngresarPageProps) {
  const params = await searchParams;
  // A dónde volver después de ingresar (ej. el producto que quiso guardar en favoritos).
  const next = sanitizeNext(typeof params.next === "string" ? params.next : null);
  const customer = await getCustomer();
  if (customer) redirect(next);
  const errorParam = typeof params.error === "string" ? params.error : null;
  const initialError =
    errorParam === "oauth" ? "No pudimos ingresar con Google. Intentá de nuevo." : null;
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true";
  return (
    <section className="mx-auto max-w-md space-y-8 py-8 md:py-14">
      <PageTitle lead="Hola," accent="reina" center>
        Entrá para ver tus pedidos y guardar tus favoritos.
      </PageTitle>
      <IngresarForm initialError={initialError} googleEnabled={googleEnabled} next={next} />
    </section>
  );
}
