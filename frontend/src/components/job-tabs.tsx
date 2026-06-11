"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { slug: "timeline", label: "Timeline" },
  { slug: "research", label: "Research" },
  { slug: "strategy", label: "Strategy" },
  { slug: "draft", label: "Draft" },
  { slug: "quality", label: "Quality" },
];

export function JobTabs({ jobId }: { jobId: string }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 overflow-x-auto border-b">
      {TABS.map((tab) => {
        const href = `/jobs/${jobId}/${tab.slug}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.slug}
            href={href}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
