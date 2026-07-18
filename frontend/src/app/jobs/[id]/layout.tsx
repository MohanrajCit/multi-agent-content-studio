"use client";

import { createContext, useContext } from "react";
import { useParams } from "next/navigation";

import { JobHeaderBar } from "@/components/job-header-bar";
import { JobTabs } from "@/components/job-tabs";
import { useJob } from "@/hooks/use-jobs";
import { useJobEvents, JobEventsContext } from "@/hooks/use-job-events";
import { isActive } from "@/lib/format";

export default function JobLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const { data: job } = useJob(jobId);
  const live = job ? isActive(job.status) : false;
  const eventsState = useJobEvents(jobId, live);

  return (
    <JobEventsContext.Provider value={eventsState}>
      <div>
        <JobHeaderBar jobId={jobId} />
        <JobTabs jobId={jobId} currentTab="timeline" onTabChange={() => {}} />
        <div className="pt-6">{children}</div>
      </div>
    </JobEventsContext.Provider>
  );
}
