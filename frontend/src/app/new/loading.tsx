"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function NewJobLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-in fade-in duration-300">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-[460px] w-full rounded-xl" />
    </div>
  );
}
