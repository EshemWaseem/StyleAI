// components/ui/skeletons.tsx
import { cn } from "@/lib/utils";

function Box({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <Box className="h-4 w-32" />
      <Box className="h-9 w-2/3 max-w-md" />
      <Box className="h-4 w-1/2 max-w-sm" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5">
            <Box className="h-3 w-20" />
            <Box className="mt-3 h-8 w-24" />
            <Box className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FullScreenSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-4 px-4">
        <Box className="mx-auto h-10 w-10 rounded-md" />
        <Box className="mx-auto h-6 w-40" />
        <Box className="mx-auto h-3 w-56" />
        <div className="mt-6 space-y-3">
          <Box className="h-10 w-full" />
          <Box className="h-10 w-full" />
          <Box className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Box className="aspect-[3/4] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Box className="h-4 w-3/4" />
        <Box className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Box className="h-4 w-16" />
          <Box className="h-8 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 sm:p-5"
        >
          <Box className="size-12 rounded-lg" />
          <Box className="h-3 w-16" />
          <Box className="h-2 w-12" />
        </div>
      ))}
    </div>
  );
}