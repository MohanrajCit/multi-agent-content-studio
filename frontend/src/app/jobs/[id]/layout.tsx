"use client";

import { useParams } from "next/navigation";

import { JobHeaderBar } from "@/components/job-header-bar";
import { JobTabs } from "@/components/job-tabs";

export default function JobLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  return (
    <div>
      <JobHeaderBar jobId={jobId} />
      <JobTabs jobId={jobId} />
      <div className="pt-6">{children}</div>
    </div>
  );
}
