"use client";

import { JobHeaderBar } from "@/components/job-header-bar";
import { JobTabs } from "@/components/job-tabs";
import { useJob } from "@/hooks/use-jobs";
import { useJobEvents, JobEventsContext } from "@/hooks/use-job-events";
import { isActive } from "@/lib/format";
import { useAppNavigation, JobTabName } from "@/app/providers";

// Import all tab views
import TimelinePage from "@/app/jobs/[id]/timeline/page";
import ResearchPage from "@/app/jobs/[id]/research/page";
import StrategyPage from "@/app/jobs/[id]/strategy/page";
import DraftEditorPage from "@/app/jobs/[id]/draft/page";
import QualityPage from "@/app/jobs/[id]/quality/page";

interface JobDetailPageProps {
  jobId: string;
  currentTab: JobTabName;
}

export function JobDetailPage({ jobId, currentTab }: JobDetailPageProps) {
  const { navigate } = useAppNavigation();
  const { data: job } = useJob(jobId);
  const live = job ? isActive(job.status) : false;
  const eventsState = useJobEvents(jobId, live);

  const handleTabChange = (tab: JobTabName) => {
    navigate("job-detail", jobId, tab);
  };

  return (
    <JobEventsContext.Provider value={eventsState}>
      <div className="space-y-4">
        <JobHeaderBar jobId={jobId} />
        <JobTabs jobId={jobId} currentTab={currentTab} onTabChange={handleTabChange} />
        <div className="pt-4">
          {currentTab === "timeline" && <TimelinePage jobId={jobId} />}
          {currentTab === "research" && <ResearchPage jobId={jobId} />}
          {currentTab === "strategy" && <StrategyPage jobId={jobId} />}
          {currentTab === "draft" && <DraftEditorPage jobId={jobId} />}
          {currentTab === "quality" && <QualityPage jobId={jobId} />}
        </div>
      </div>
    </JobEventsContext.Provider>
  );
}
