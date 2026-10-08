import type { Metadata } from "next";
import { ArrowUpRight, Clock, Instagram, Mail, MessageCircle, Music2, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { businessInfo, PLACEHOLDER_PREFIX } from "@/lib/legal/business-info";
import { whatsappLink } from "@/lib/whatsapp";
import { PageTitle } from "@/components/ui/page-title";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escribinos por email o WhatsApp. Estamos para ayudarte con tu compra en Glamify Makeup.",
};

interface Channel {
  href: string;
  icon: LucideIcon;
  label: string;
  detail: string;
  ariaLabel: string;
  external?: boolean;
}

export default async function ContactoPage() {
  const setting = await prisma.setting.findUnique({
    where: { id: "default" },
    select: { whatsappNumber: true, instagramUrl: true, tiktokUrl: true },
  });
  const waHref = whatsappLink(setting?.whatsappNumber);
  const emailIsSet = !businessInfo.email.includes(PLACEHOLDER_PREFIX);

  const channels: Channel[] = [
    ...(waHref
      ? [{ href: waHref, icon: MessageCircle, label: "WhatsApp", detail: "Para consultas de productos, tonos y pedidos", ariaLabel: "Escribir por WhatsApp", external: true }]
      : []),
    ...(emailIsSet
      ? [{ href: `mailto:${businessInfo.email}`, icon: Mail, label: "Email", detail: businessInfo.email, ariaLabel: `Escribir un email a ${businessInfo.email}` }]
      : []),
    ...(setting?.instagramUrl
      ? [{ href: setting.instagramUrl, icon: Instagram, label: "Instagram", detail: "Seguinos para ver las novedades", ariaLabel: "Abrir Instagram de Glamify Makeup", external: true }]
      : []),
    ...(setting?.tiktokUrl
      ? [{ href: setting.tiktokUrl, icon: Music2, label: "TikTok", detail: "Seguinos en TikTok", ariaLabel: "Abrir TikTok de Glamify Makeup", external: true }]
      : []),
  ];

  return (
    <section className="mx-auto max-w-prose space-y-8 py-8 md:py-12">
      <PageTitle lead="Estamos para" accent="ayudarte">
        ¿Tenés una consulta sobre un producto, tu pedido o un cambio? Escribinos por donde te quede más cómodo.
      </PageTitle>

      <ul className="space-y-3">
        {channels.map((c) => (
          <li key={c.label}>
            <a
              href={c.href}
              {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              aria-label={c.ariaLabel}
              className="group flex min-h-[72px] items-center gap-4 rounded-[20px] border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[0_10px_30px_-18px_rgba(22,20,19,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <c.icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold text-foreground">{c.label}</span>
                <span className="block truncate text-[15px] text-muted-foreground">{c.detail}</span>
              </span>
              <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden />
            </a>
          </li>
        ))}
      </ul>

      <p className="flex items-start gap-3 rounded-[20px] bg-secondary p-5 text-[15px] leading-relaxed text-muted-foreground">
        <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <span>Atendemos de lunes a viernes de 9 a 18 h y respondemos dentro de las 48 horas hábiles.</span>
      </p>
    </section>
  );
}
