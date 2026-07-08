"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
  CheckCircle2, CircleDashed, Loader2, Search, XCircle,
  FileText, BarChart, FileCode, Clock,
  Terminal, Info, Activity, Shield, Copy, Check
} from "lucide-react";
import { useParams } from "next/navigation";
import { useJob, useJobStatus, useJobResults } from "@/hooks/use-jobs";
import { useJobEvents } from "@/hooks/use-job-events";
import { isActive } from "@/lib/format";
import type { StageEvent, StageName, JobResults } from "@/lib/types";

/* ── n8n-style colors per agent ─────────────────────────────────── */
const AGENT_COLORS: Record<string, string> = {
  guard: "#8B5CF6", research: "#3B82F6", competitor: "#06B6D4",
  gap: "#F59E0B", strategy: "#6366F1", writer: "#10B981", evaluator: "#F43F5E",
};

/* ── Pipeline stage metadata ────────────────────────────────────── */
const STAGES = [
  { id: "guard",      label: "Guard Agent",      desc: "Validate & safety check", icon: Shield,      stageKey: "GUARD" as StageName },
  { id: "research",   label: "Research Agent",    desc: "Web search & trends",     icon: Search,      stageKey: "RESEARCH" as StageName },
  { id: "competitor", label: "Competitor Agent",   desc: "Competitive analysis",    icon: BarChart,    stageKey: "COMPETITOR" as StageName },
  { id: "gap",        label: "Gap Analysis",      desc: "Content gap finder",      icon: Activity,    stageKey: "GAP" as StageName },
  { id: "strategy",   label: "Strategy Agent",    desc: "SEO & content plan",      icon: FileText,    stageKey: "STRATEGY" as StageName },
  { id: "writer",     label: "Writer Agent",      desc: "Draft generation",        icon: FileCode,    stageKey: "WRITER" as StageName },
  { id: "evaluator",  label: "Evaluator Agent",   desc: "Quality scoring",         icon: CheckCircle2, stageKey: "EVALUATOR" as StageName },
];

/* ── Canvas layout constants ────────────────────────────────────── */
const NW = 192, NH = 72, GX = 48, GY = 88, PAD = 36;

// Row 1 (L→R): guard, research, competitor, gap
// Row 2 (R→L): strategy, writer, evaluator
const LAYOUT: Record<string, { row: number; col: number }> = {
  guard: { row: 0, col: 0 }, research: { row: 0, col: 1 },
  competitor: { row: 0, col: 2 }, gap: { row: 0, col: 3 },
  strategy: { row: 1, col: 3 }, writer: { row: 1, col: 2 },
  evaluator: { row: 1, col: 1 },
};

function pos(id: string) {
  const l = LAYOUT[id];
  return { x: PAD + l.col * (NW + GX), y: PAD + l.row * (NH + GY) };
}

const CW = PAD * 2 + 4 * NW + 3 * GX;   // canvas width
const CH = PAD * 2 + 2 * NH + GY;         // canvas height

// Edge definitions: [fromId, toId, type]
const EDGES: [string, string, "h" | "h-rev" | "v"][] = [
  ["guard", "research", "h"], ["research", "competitor", "h"],
  ["competitor", "gap", "h"], ["gap", "strategy", "v"],
  ["strategy", "writer", "h-rev"], ["writer", "evaluator", "h-rev"],
];

type NodeStatus = "waiting" | "running" | "completed" | "failed";

/* ── Helpers ────────────────────────────────────────────────────── */
function getStageOutput(id: string, r: JobResults | undefined): Record<string, unknown> | null {
  if (!r) return null;
  const m: Record<string, unknown> = {
    guard: r.request_profile, research: r.research, competitor: r.competitor,
    gap: r.gaps, strategy: r.strategy, evaluator: r.evaluation,
    writer: r.draft ? { title: r.draft.title, sections: r.draft.sections.length, word_count: r.draft.word_count } : null,
  };
  return (m[id] as Record<string, unknown>) ?? null;
}

function durations(events: StageEvent[]): Record<string, number> {
  const d: Record<string, number> = {}, s: Record<string, number> = {};
  for (const e of events) {
    if (e.status === "RUNNING") s[e.stage] = new Date(e.created_at).getTime();
    else if ((e.status === "COMPLETED" || e.status === "FAILED") && s[e.stage])
      d[e.stage] = (new Date(e.created_at).getTime() - s[e.stage]) / 1000;
  }
  return d;
}

function fmtDur(s: number) {
  if (s < 1) return "<1s";
  if (s < 60) return `${Math.round(s)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/* ── SVG edge path builder ──────────────────────────────────────── */
function edgePath(fromId: string, toId: string, type: "h" | "h-rev" | "v"): string {
  const f = pos(fromId), t = pos(toId);
  if (type === "h") {
    const x1 = f.x + NW, y1 = f.y + NH / 2, x2 = t.x, y2 = t.y + NH / 2;
    const mx = (x1 + x2) / 2;
    return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
  }
  if (type === "h-rev") {
    const x1 = f.x, y1 = f.y + NH / 2, x2 = t.x + NW, y2 = t.y + NH / 2;
    const mx = (x1 + x2) / 2;
    return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
  }
  // vertical
  const x1 = f.x + NW / 2, y1 = f.y + NH, x2 = t.x + NW / 2, y2 = t.y;
  const my = (y1 + y2) / 2;
  return `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
}

/* ── Copy button ────────────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  const go = useCallback(() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); }, [text]);
  return (
    <button onClick={go} className="absolute top-3 right-3 p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity" title="Copy">
      {ok ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export function WorkflowVisualizer() {
  const { id: jobId } = useParams<{ id: string }>();
  const { data: job } = useJob(jobId);
  const live = job ? isActive(job.status) : false;
  const { data: status } = useJobStatus(jobId, { live });
  const { events: sseEvents, connected } = useJobEvents(jobId, live);
  const { data: results } = useJobResults(jobId);
  const [selId, setSelId] = useState<string | null>(null);

  const merged = useMemo<StageEvent[]>(() => {
    const m = new Map<number, StageEvent>();
    for (const e of status?.events ?? []) m.set(e.seq, e);
    for (const e of sseEvents) m.set(e.seq, e);
    return [...m.values()].sort((a, b) => a.seq - b.seq);
  }, [status?.events, sseEvents]);

  const nodeStatus = useMemo(() => {
    const s: Record<string, NodeStatus> = {};
    STAGES.forEach(n => (s[n.id] = "waiting"));
    if (job?.status === "DONE") STAGES.forEach(n => (s[n.id] = "completed"));
    const map: Record<string, string> = { GUARD: "guard", RESEARCH: "research", COMPETITOR: "competitor", GAP: "gap", STRATEGY: "strategy", WRITER: "writer", EVALUATOR: "evaluator" };
    merged.forEach(ev => {
      const nid = map[ev.stage];
      if (!nid) return;
      s[nid] = ev.status === "RUNNING" ? "running" : ev.status === "COMPLETED" || ev.status === "SKIPPED" ? "completed" : ev.status === "FAILED" ? "failed" : "waiting";
    });
    return s;
  }, [merged, job?.status]);

  const dur = useMemo(() => durations(merged), [merged]);
  const completedN = Object.values(nodeStatus).filter(s => s === "completed").length;
  const pct = job?.status === "DONE" ? 100 : Math.round((completedN / STAGES.length) * 100);
  const log = useMemo(() => [...merged].sort((a, b) => b.seq - a.seq).slice(0, 50), [merged]);
  const activeId = Object.keys(nodeStatus).reverse().find(k => nodeStatus[k] === "running") ?? null;
  const selected = STAGES.find(n => n.id === (selId ?? activeId ?? "guard"))!;
  const selStatus = nodeStatus[selected.id];
  const selOutput = getStageOutput(selected.id, results);
  const selDur = dur[selected.stageKey];
  const selEvents = useMemo(() => {
    const map: Record<string, string> = { GUARD: "guard", RESEARCH: "research", COMPETITOR: "competitor", GAP: "gap", STRATEGY: "strategy", WRITER: "writer", EVALUATOR: "evaluator" };
    return merged.filter(e => map[e.stage] === selected.id);
  }, [merged, selected.id]);

  const totalTime = useMemo(() => {
    if (merged.length < 2) return null;
    return (new Date(merged[merged.length - 1].created_at).getTime() - new Date(merged[0].created_at).getTime()) / 1000;
  }, [merged]);

  /* ── Edge status (color/animation) ──────────────────────────── */
  function edgeStatus(fromId: string, toId: string): NodeStatus {
    const fs = nodeStatus[fromId], ts = nodeStatus[toId];
    if (fs === "completed" && ts === "completed") return "completed";
    if (fs === "completed" && ts === "running") return "running";
    if (ts === "failed") return "failed";
    return "waiting";
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[620px] bg-[#0F1117] rounded-xl border border-[#1E2028] overflow-hidden">
      {/* ── Status Bar ─────────────────────────────────────────── */}
      <header className="h-12 shrink-0 border-b border-[#1E2028] flex items-center justify-between px-5 bg-[#0F1117]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-zinc-200">Pipeline Execution</span>
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${job?.status === "DONE" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : live ? "bg-orange-500/10 border-orange-500/25 text-orange-400" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>
            {job?.status ?? "QUEUED"}
          </span>
          {connected && live && <span className="flex items-center gap-1.5 text-[10px] text-sky-400 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />Live</span>}
        </div>
        <div className="flex items-center gap-5 text-xs text-zinc-400">
          {totalTime != null && <span className="flex items-center gap-1.5 font-mono"><Clock className="w-3.5 h-3.5" />{fmtDur(totalTime)}</span>}
          <span className="font-mono text-zinc-300">{pct}%</span>
          <div className="w-20 h-1.5 bg-[#1E2028] rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} /></div>
          <span className="text-zinc-500">{completedN}/{STAGES.length}</span>
        </div>
      </header>

      {/* ── n8n Canvas ─────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-[#1E2028] overflow-x-auto" style={{ background: "radial-gradient(circle, #1a1b23 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
        <div className="relative mx-auto" style={{ width: CW, height: CH, minWidth: CW }}>
          {/* SVG edges */}
          <svg className="absolute inset-0 pointer-events-none" width={CW} height={CH}>
            <defs>
              <marker id="arrow-done" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" /></marker>
              <marker id="arrow-run"  viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6 Z" fill="#f97316" /></marker>
              <marker id="arrow-wait" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6 Z" fill="#3f3f46" /></marker>
            </defs>
            {EDGES.map(([fId, tId, type]) => {
              const es = edgeStatus(fId, tId);
              const stroke = es === "completed" ? "#22c55e" : es === "running" ? "#f97316" : es === "failed" ? "#ef4444" : "#27272a";
              const marker = es === "completed" ? "url(#arrow-done)" : es === "running" ? "url(#arrow-run)" : "url(#arrow-wait)";
              return (
                <g key={`${fId}-${tId}`}>
                  <path d={edgePath(fId, tId, type)} fill="none" stroke={stroke} strokeWidth={2} markerEnd={marker}
                    strokeDasharray={es === "running" ? "6 4" : es === "waiting" ? "3 3" : "none"}
                    className={es === "running" ? "animate-[marchingAnts_0.6s_linear_infinite]" : ""} />
                  {/* Glow for active edges */}
                  {es === "running" && <path d={edgePath(fId, tId, type)} fill="none" stroke={stroke} strokeWidth={6} opacity={0.15} />}
                </g>
              );
            })}
          </svg>

          {/* Node cards */}
          {STAGES.map(node => {
            const p = pos(node.id);
            const ns = nodeStatus[node.id];
            const isSel = selected.id === node.id;
            const color = AGENT_COLORS[node.id];
            const d = dur[node.stageKey];
            const Icon = node.icon;

            return (
              <button key={node.id} onClick={() => setSelId(node.id)}
                className={`absolute flex items-center gap-3 rounded-xl border-[1.5px] px-3.5 transition-all duration-200 text-left group/node
                  ${isSel ? "shadow-lg shadow-blue-500/10 border-blue-500/60 bg-[#171923]" :
                    ns === "running" ? "border-orange-500/40 bg-[#14161E] shadow-md shadow-orange-500/5" :
                    ns === "completed" ? "border-emerald-500/20 bg-[#12141C] hover:border-emerald-500/40" :
                    ns === "failed" ? "border-red-500/30 bg-[#14161E]" :
                    "border-[#1E2028] bg-[#12141C] hover:border-[#2a2c38]"}`}
                style={{ left: p.x, top: p.y, width: NW, height: NH }}>
                {/* Left accent bar */}
                <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full" style={{ backgroundColor: ns === "waiting" ? "#27272a" : color }} />
                {/* Icon */}
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-colors"
                  style={{ backgroundColor: `${color}15`, borderColor: `${color}30`, color: ns === "waiting" ? "#52525b" : color }}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                {/* Text */}
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-semibold truncate ${ns === "waiting" ? "text-zinc-500" : "text-zinc-100"}`}>{node.label}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{d != null ? fmtDur(d) : node.desc}</p>
                </div>
                {/* Status badge */}
                <div className="absolute -top-2 -right-2 z-10">
                  {ns === "completed" && <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30"><Check className="w-3 h-3 text-white" strokeWidth={3} /></div>}
                  {ns === "running" && <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/30 animate-pulse"><Loader2 className="w-3 h-3 text-white animate-spin" /></div>}
                  {ns === "failed" && <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-md shadow-red-500/30"><XCircle className="w-3 h-3 text-white" /></div>}
                </div>
                {/* Running glow */}
                {ns === "running" && <div className="absolute inset-0 rounded-xl opacity-[0.06] pointer-events-none" style={{ boxShadow: `0 0 30px 10px ${color}, inset 0 0 20px 5px ${color}` }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bottom: Console + Inspector ────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Console */}
        <div className="w-[45%] border-r border-[#1E2028] flex flex-col">
          <div className="px-4 py-2 border-b border-[#1E2028] bg-[#13151D] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2"><Terminal className="w-3.5 h-3.5 text-zinc-500" /><span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">Console</span><span className="text-[9px] font-mono text-zinc-600 bg-[#1E2028] px-1.5 py-0.5 rounded">{merged.length}</span></div>
            <div className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${connected && live ? "bg-emerald-400" : "bg-zinc-700"}`} /><span className="text-[10px] text-zinc-500">{connected && live ? "Connected" : "Idle"}</span></div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed">
            {log.length === 0 ? (
              <div className="flex items-center gap-2 text-zinc-600 py-4 px-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Waiting for events…</div>
            ) : log.map(ev => (
              <div key={ev.seq} className="flex items-start gap-2 px-2 py-1 rounded hover:bg-[#171923] transition-colors">
                <span className="text-zinc-600 w-[70px] shrink-0 tabular-nums">{fmtTime(ev.created_at)}</span>
                <span className={`w-[90px] shrink-0 font-semibold ${ev.status === "RUNNING" ? "text-orange-400" : ev.status === "COMPLETED" ? "text-emerald-400" : ev.status === "FAILED" ? "text-red-400" : "text-blue-400"}`}>{ev.stage}</span>
                <span className={`${ev.status === "FAILED" ? "text-red-300" : "text-zinc-500"}`}>{ev.status.toLowerCase()}{ev.detail ? ` → ${ev.detail}` : ""}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Inspector */}
        <div className="w-[55%] flex flex-col bg-[#0F1117]">
          <div className="px-4 py-2 border-b border-[#1E2028] bg-[#13151D] flex items-center gap-2 shrink-0"><Info className="w-3.5 h-3.5 text-zinc-500" /><span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">Agent Inspector</span></div>
          <div className="flex-1 overflow-y-auto p-4">
            {/* Header */}
            <div className="flex items-start gap-3 pb-4 mb-4 border-b border-[#1E2028]">
              <div className="p-2.5 rounded-xl border" style={{ backgroundColor: `${AGENT_COLORS[selected.id]}12`, borderColor: `${AGENT_COLORS[selected.id]}30`, color: AGENT_COLORS[selected.id] }}><selected.icon className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-zinc-100">{selected.label}</h3>
                <p className="text-xs text-zinc-500">{selected.desc}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded border ${selStatus === "completed" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : selStatus === "running" ? "bg-orange-500/10 border-orange-500/25 text-orange-400" : selStatus === "failed" ? "bg-red-500/10 border-red-500/25 text-red-400" : "bg-zinc-800 border-zinc-700 text-zinc-500"}`}>{selStatus}</span>
                  {selDur != null && <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDur(selDur)}</span>}
                </div>
              </div>
            </div>
            {/* Stage events */}
            {selEvents.length > 0 && (
              <div className="mb-4">
                <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Events</h4>
                <div className="space-y-1">
                  {selEvents.map(ev => (
                    <div key={ev.seq} className="flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-lg bg-[#13151D] border border-[#1E2028]">
                      {ev.status === "COMPLETED" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : ev.status === "RUNNING" ? <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin shrink-0" /> : <CircleDashed className="w-3.5 h-3.5 text-zinc-600 shrink-0" />}
                      <span className="text-zinc-300 font-medium">{ev.status.toLowerCase()}</span>
                      {ev.detail && <span className="text-zinc-600 truncate">— {ev.detail}</span>}
                      <span className="ml-auto text-[9px] text-zinc-600 font-mono shrink-0">{fmtTime(ev.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Output */}
            <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Structured Output</h4>
            {selOutput ? (
              <div className="relative group rounded-lg bg-[#13151D] border border-[#1E2028] p-3 overflow-hidden">
                <CopyBtn text={JSON.stringify(selOutput, null, 2)} />
                <pre className="text-[10px] font-mono text-zinc-400 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[260px] overflow-y-auto">{JSON.stringify(selOutput, null, 2)}</pre>
              </div>
            ) : (
              <div className="rounded-lg bg-[#13151D] border border-[#1E2028] p-6 flex flex-col items-center text-center">
                <CircleDashed className="w-7 h-7 text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-500">{selStatus === "waiting" ? "Stage has not started" : selStatus === "running" ? "Processing…" : "No output data"}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
