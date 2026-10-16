import { Skeleton } from "@/components/ui/skeleton";

export default function CuentaLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando cuenta...">
      <Skeleton className="h-8 w-44" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-4 rounded-[20px] border border-border p-5 md:col-span-2">
          <Skeleton className="h-10 w-48 rounded-full" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          ))}
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-28 rounded-[20px]" />
          <Skeleton className="h-28 rounded-[20px]" />
        </div>
      </div>
    </div>
  );
}
