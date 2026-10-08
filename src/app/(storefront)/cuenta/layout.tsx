import { requireCustomer } from "@/lib/customer/auth";
import { PageTitle } from "@/components/ui/page-title";
import { AccountNav } from "./account-nav";

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  await requireCustomer();
  return (
    <section className="space-y-8 py-8 md:py-12">
      <PageTitle lead="Mi" accent="cuenta" />
      <AccountNav />
      <div>{children}</div>
    </section>
  );
}
