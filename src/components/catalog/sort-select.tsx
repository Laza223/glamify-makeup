"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OPTIONS = [
  { value: "relevancia", label: "Recomendados" },
  { value: "novedades", label: "Lo más nuevo" },
  { value: "precio_asc", label: "Menor precio" },
  { value: "precio_desc", label: "Mayor precio" },
] as const;

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("orden") ?? "relevancia";

  const onChange = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("orden", value);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger
        className="h-11 w-[170px] rounded-full border-border px-5 text-[15px] font-semibold hover:border-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label="Ordenar"
      >
        <SelectValue placeholder="Ordenar" />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value} className="min-h-11 text-[15px]">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
