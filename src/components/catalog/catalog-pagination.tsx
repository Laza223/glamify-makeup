"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function CatalogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  const pathname = usePathname();
  const params = useSearchParams();
  if (totalPages <= 1) return null;

  const hrefFor = (p: number) => {
    const next = new URLSearchParams(params.toString());
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <Pagination className="pt-6">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={hrefFor(page - 1)}
            aria-disabled={page <= 1}
            className={cn("h-11 rounded-full", page <= 1 && "pointer-events-none opacity-40")}
          />
        </PaginationItem>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <PaginationItem key={p}>
            <PaginationLink
              href={hrefFor(p)}
              isActive={p === page}
              className={cn("size-11 rounded-full text-[15px] font-semibold", p === page && "border-foreground bg-foreground text-white hover:bg-foreground hover:text-white")}
            >
              {p}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href={hrefFor(page + 1)}
            aria-disabled={page >= totalPages}
            className={cn("h-11 rounded-full", page >= totalPages && "pointer-events-none opacity-40")}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
