"use client";

import { useState, createContext, useContext } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

export type PageName = "dashboard" | "new" | "history" | "agents" | "job-detail";
export type JobTabName = "timeline" | "research" | "strategy" | "draft" | "quality";

export interface NavigationState {
  page: PageName;
  jobId: string | null;
  jobTab: JobTabName;
  /** When navigating to Agents Workflow with a newly-created job */
  agentJobId: string | null;
}

interface NavigationContextType {
  view: NavigationState;
  navigate: (page: PageName, jobId?: string | null, jobTab?: JobTabName) => void;
  /** Navigate to agents page with a specific job ID to watch */
  navigateToAgents: (jobId: string) => void;
  /** Clear agentJobId after the agents page has consumed it */
  clearAgentJobId: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function useAppNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useAppNavigation must be used within NavigationProvider");
  return ctx;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const [view, setViewState] = useState<NavigationState>({
    page: "dashboard",
    jobId: null,
    jobTab: "timeline",
    agentJobId: null,
  });

  const navigate = (page: PageName, jobId: string | null = null, jobTab: JobTabName = "timeline") => {
    setViewState({ page, jobId, jobTab, agentJobId: null });
  };

  const navigateToAgents = (jobId: string) => {
    setViewState({ page: "agents", jobId: null, jobTab: "timeline", agentJobId: jobId });
  };

  const clearAgentJobId = () => {
    setViewState((prev) => ({ ...prev, agentJobId: null }));
  };

  return (
    <QueryClientProvider client={client}>
      <NavigationContext.Provider value={{ view, navigate, navigateToAgents, clearAgentJobId }}>
        {children}
      </NavigationContext.Provider>
      <Toaster richColors position="top-right" closeButton />
    </QueryClientProvider>
  );
}
