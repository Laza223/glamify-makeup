import type { Metadata } from "next";
import { BundlePage } from "@/components/bundle/bundle-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Armá tu box de maquillaje",
  description: "Elegí tus productos favoritos desde $15.000 y armamos tu box de maquillaje.",
};

export default function ArmarBoxPage() {
  return <BundlePage kind="box" />;
}
