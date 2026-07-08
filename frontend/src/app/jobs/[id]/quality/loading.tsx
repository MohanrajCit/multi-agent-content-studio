"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function QualityLoading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr] animate-in fade-in duration-200">
      <Skeleton className="h-72 rounded-xl" />
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
