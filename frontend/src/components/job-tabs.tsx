"use client";

import { cn } from "@/lib/utils";
import { JobTabName } from "@/app/providers";

const TABS: { slug: JobTabName; label: string }[] = [
  { slug: "timeline", label: "Timeline" },
  { slug: "research", label: "Research" },
  { slug: "strategy", label: "Strategy" },
  { slug: "draft", label: "Draft" },
  { slug: "quality", label: "Quality" },
];

interface JobTabsProps {
  jobId: string;
  currentTab: JobTabName;
  onTabChange: (tab: JobTabName) => void;
}

export function JobTabs({ jobId, currentTab, onTabChange }: JobTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-900">
      {TABS.map((tab) => {
        const active = currentTab === tab.slug;
        return (
          <button
            key={tab.slug}
            onClick={() => onTabChange(tab.slug)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none whitespace-nowrap",
              active
                ? "border-orange-500 text-white"
                : "border-transparent text-slate-500 hover:text-slate-200",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
