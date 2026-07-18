"use client";

import { useAppNavigation, PageName } from "@/app/providers";
import { LayoutDashboard, PlusCircle, History, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { page: "dashboard" as PageName, label: "Dashboard", icon: LayoutDashboard },
  { page: "new" as PageName, label: "New Content Job", icon: PlusCircle },
  { page: "history" as PageName, label: "History", icon: History },
  { page: "agents" as PageName, label: "Agents Workflow", icon: Sparkles },
];

export function AppSidebar() {
  const { view, navigate } = useAppNavigation();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-900 bg-[#060b13] p-5 md:flex">
      {/* Brand Header */}
      <button 
        onClick={() => navigate("dashboard")}
        className="mb-8 flex items-center gap-3 px-2 group text-left w-full focus:outline-none"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-transform duration-300 group-hover:scale-105">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight text-white group-hover:text-orange-400 transition-colors">
            Content Studio
          </p>
          <p className="text-[10px] text-slate-400 font-medium">Multi-Agent Swarm</p>
        </div>
      </button>

      {/* Navigation */}
      <nav className="flex flex-col gap-1.5 flex-1">
        {NAV.map((item) => {
          const active = view.page === item.page;
          const Icon = item.icon;
          return (
            <button
              key={item.page}
              onClick={() => navigate(item.page)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 relative group w-full text-left focus:outline-none",
                active
                  ? "bg-slate-900 text-orange-400 border border-slate-800"
                  : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
              )}
            >
              <Icon className={cn("h-4.5 w-4.5 transition-colors", active ? "text-orange-500" : "text-slate-500 group-hover:text-slate-300")} />
              {item.label}

              {/* Active Glow Bar */}
              {active && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Connection Status Card */}
      <div className="rounded-xl border border-slate-900 bg-[#090f1a] p-4 text-[10px] text-slate-400 flex flex-col gap-2.5 mb-6">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300">Swarm Status</span>
          <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>
        <p className="leading-relaxed text-slate-500">
          Swarm active: research → strategy → draft → quality checks.
        </p>
      </div>
    </aside>
  );
}
