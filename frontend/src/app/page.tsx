"use client";

import { useAppNavigation } from "@/app/providers";
import { DashboardView } from "@/components/dashboard-view";
import NewJobPage from "@/app/new/page";
import HistoryPage from "@/app/history/page";
import AgentsWorkflowPage from "@/app/agents/page";
import { JobDetailPage } from "@/components/job-detail-page";

export default function AppShell() {
  const { view } = useAppNavigation();

  return (
    <>
      {view.page === "dashboard" && <DashboardView />}
      {view.page === "new" && <NewJobPage />}
      {view.page === "history" && <HistoryPage />}
      {view.page === "agents" && <AgentsWorkflowPage />}
      {view.page === "job-detail" && view.jobId && (
        <JobDetailPage jobId={view.jobId} currentTab={view.jobTab} />
      )}
    </>
  );
}
