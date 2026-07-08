"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function StrategyLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
