"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function VisualizerLoading() {
  return (
    <div className="h-[calc(100vh-180px)] min-h-[600px] rounded-xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in duration-200">
      <Skeleton className="h-14 w-full rounded-t-xl rounded-b-none" />
      <Skeleton className="h-20 w-full rounded-none" />
      <div className="flex flex-1 h-[calc(100%-136px)]">
        <Skeleton className="w-1/2 h-full rounded-none" />
        <Skeleton className="w-1/2 h-full rounded-none rounded-br-xl" />
      </div>
    </div>
  );
}
