import type { Metadata } from "next";
import { BundlePage } from "@/components/bundle/bundle-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Armá tu ramo de maquillaje",
  description: "Elegí tus productos favoritos desde $15.000 y armamos tu ramo de maquillaje.",
};

export default function ArmarRamoPage() {
  return <BundlePage kind="ramo" />;
}
