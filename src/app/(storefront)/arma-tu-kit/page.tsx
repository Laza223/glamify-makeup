import type { Metadata } from "next";
import { getKitBuilderData } from "@/lib/catalog/kit";
import { KitBuilder } from "@/components/bundle/kit-builder";

export const metadata: Metadata = {
  title: "Armá tu Kit",
  description: "Elegí tus esenciales de Labios, Ojos y Rostro y armá tu kit de maquillaje.",
};

export default async function ArmaTuKitPage() {
  const data = await getKitBuilderData();

  return (
    <div className="py-8 md:py-12">
      <KitBuilder
        labios={data.labios}
        ojos={data.ojos}
        rostro={data.rostro}
        curatedCombos={data.curatedCombos}
      />
    </div>
  );
}
