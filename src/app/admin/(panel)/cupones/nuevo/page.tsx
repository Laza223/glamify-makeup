import { TicketPlus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { CouponForm } from "@/app/admin/(panel)/cupones/coupon-form";
import { requireAdmin } from "@/lib/admin/auth";

export default async function NuevoCuponPage() {
  await requireAdmin();
  return (
    <div className="stagger space-y-6">
      <PageHeader
        icon={TicketPlus}
        title="Nuevo cupón"
        subtitle="Crea un código de descuento para que tus clientas paguen menos."
      />
      <CouponForm />
    </div>
  );
}
