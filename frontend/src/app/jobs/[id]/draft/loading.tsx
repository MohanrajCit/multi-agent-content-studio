"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function DraftLoading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px] animate-in fade-in duration-200">
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
