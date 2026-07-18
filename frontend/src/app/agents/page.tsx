"use client";

import { useCallback, useState, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Handle,
  Position,
  ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Shield,
  Search,
  BarChart,
  Activity,
  FileText,
  FileCode,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  Terminal,
  Info,
  Clock,
  Check,
  Copy,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateJob, useJobResults, useJob, useJobs } from "@/hooks/use-jobs";
import { useJobEvents } from "@/hooks/use-job-events";
import { useAppNavigation } from "@/app/providers";
import { toast } from "sonner";
import type { JobCreateRequest, StageEvent } from "@/lib/types";

type AgentNodeData = {
  title: string;
  subtitle: string;
  iconName: string;
  status: "idle" | "running" | "completed" | "failed";
  colorHex: string;
};

const ICONS: Record<string, React.FC<any>> = {
  shield: Shield,
  search: Search,
  barChart: BarChart,
  activity: Activity,
  fileText: FileText,
  fileCode: FileCode,
  checkCircle: CheckCircle2,
};

function AgentNode({ data }: { data: AgentNodeData }) {
  const Icon = ICONS[data.iconName] || Circle;

  return (
    <div
      className={cn(
        "relative flex w-[240px] flex-col rounded-xl border bg-[#0d111d] p-3 text-white shadow-xl transition-all duration-300 hover:scale-[1.02]",
        data.status === "running"
          ? "border-orange-500/80 shadow-[0_0_20px_rgba(249,115,22,0.25)]"
          : data.status === "completed"
          ? "border-emerald-500/30"
          : "border-slate-800/80 hover:border-slate-700"
      )}
    >
      <Handle type="target" position={Position.Left} id="t-left" className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle type="target" position={Position.Top} id="t-top" className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle type="target" position={Position.Right} id="t-right" className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="!h-2 !w-2 !border-0 !bg-transparent" />

      <div
        className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${data.colorHex}15` }}
      >
        <Icon className="h-4.5 w-4.5" style={{ color: data.colorHex }} />
      </div>

      <div className="mb-4 flex flex-col gap-1">
        <h3 className="text-xs font-bold tracking-wide">{data.title}</h3>
        <p className="text-[10px] text-slate-400 truncate">{data.subtitle}</p>
      </div>

      <div className="flex items-center gap-1.5 border-t border-slate-800/60 pt-2.5 text-[10px] font-medium tracking-wide">
        {data.status === "running" ? (
          <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
        ) : data.status === "completed" ? (
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        ) : (
          <Circle className="h-1.5 w-1.5 fill-current text-slate-600" />
        )}
        <span
          className={cn(
            data.status === "running"
              ? "text-orange-500"
              : data.status === "completed"
              ? "text-emerald-500"
              : "text-slate-500"
          )}
        >
          {data.status === "running" ? "Running" : data.status === "completed" ? "Completed" : "Idle"}
        </span>
        {data.status === "running" && (
          <span className="ml-auto rounded bg-orange-500/10 px-1 py-0.5 text-[9px] text-orange-500 font-bold">
            Active
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="s-right" className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle type="source" position={Position.Left} id="s-left" className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle type="source" position={Position.Top} id="s-top" className="!h-2 !w-2 !border-0 !bg-transparent" />
    </div>
  );
}

const nodeTypes = {
  agentNode: AgentNode,
};

const AGENT_COLORS: Record<string, string> = {
  guard: "#8B5CF6",
  research: "#3B82F6",
  competitor: "#06B6D4",
  gap: "#F59E0B",
  strategy: "#6366F1",
  writer: "#10B981",
  evaluator: "#F43F5E",
};

const defaultNodes: Node[] = [
  {
    id: "guard",
    type: "agentNode",
    position: { x: 40, y: 50 },
    data: { title: "Guard Agent", subtitle: "Validate & safety check", iconName: "shield", status: "idle", colorHex: AGENT_COLORS.guard },
  },
  {
    id: "research",
    type: "agentNode",
    position: { x: 310, y: 50 },
    data: { title: "Research Agent", subtitle: "Web search & trends", iconName: "search", status: "idle", colorHex: AGENT_COLORS.research },
  },
  {
    id: "competitor",
    type: "agentNode",
    position: { x: 580, y: 50 },
    data: { title: "Competitor Agent", subtitle: "Competitive analysis", iconName: "barChart", status: "idle", colorHex: AGENT_COLORS.competitor },
  },
  {
    id: "gap",
    type: "agentNode",
    position: { x: 850, y: 50 },
    data: { title: "Gap Analysis", subtitle: "Content gap finder", iconName: "activity", status: "idle", colorHex: AGENT_COLORS.gap },
  },
  {
    id: "strategy",
    type: "agentNode",
    position: { x: 850, y: 260 },
    data: { title: "Strategy Agent", subtitle: "SEO & content plan", iconName: "fileText", status: "idle", colorHex: AGENT_COLORS.strategy },
  },
  {
    id: "writer",
    type: "agentNode",
    position: { x: 580, y: 260 },
    data: { title: "Writer Agent", subtitle: "Draft generation", iconName: "fileCode", status: "idle", colorHex: AGENT_COLORS.writer },
  },
  {
    id: "evaluator",
    type: "agentNode",
    position: { x: 310, y: 260 },
    data: { title: "Evaluator Agent", subtitle: "Quality scoring", iconName: "checkCircle", status: "idle", colorHex: AGENT_COLORS.evaluator },
  },
];

const getEdgeStyle = (status: "completed" | "running" | "idle") => {
  if (status === "completed") {
    return { stroke: "#10B981", strokeWidth: 2 };
  }
  if (status === "running") {
    return { stroke: "#f97316", strokeWidth: 2, filter: "drop-shadow(0 0 3px #f97316)" };
  }
  return { stroke: "#1e293b", strokeWidth: 2, strokeDasharray: "4 4" };
};

const defaultEdges: Edge[] = [
  { id: "e-guard-research", source: "guard", target: "research", sourceHandle: "s-right", targetHandle: "t-left", animated: false, type: "smoothstep", style: getEdgeStyle("idle") },
  { id: "e-research-competitor", source: "research", target: "competitor", sourceHandle: "s-right", targetHandle: "t-left", animated: false, type: "smoothstep", style: getEdgeStyle("idle") },
  { id: "e-competitor-gap", source: "competitor", target: "gap", sourceHandle: "s-right", targetHandle: "t-left", animated: false, type: "smoothstep", style: getEdgeStyle("idle") },
  { id: "e-gap-strategy", source: "gap", target: "strategy", sourceHandle: "s-bottom", targetHandle: "t-top", animated: false, type: "smoothstep", style: getEdgeStyle("idle") },
  { id: "e-strategy-writer", source: "strategy", target: "writer", sourceHandle: "s-left", targetHandle: "t-right", animated: false, type: "smoothstep", style: getEdgeStyle("idle") },
  { id: "e-writer-evaluator", source: "writer", target: "evaluator", sourceHandle: "s-left", targetHandle: "t-right", animated: false, type: "smoothstep", style: getEdgeStyle("idle") },
];

const TONES = ["Professional", "Conversational", "Authoritative", "Friendly", "Technical", "Playful"];
const PLATFORMS = ["Blog", "LinkedIn", "Twitter/X", "Newsletter", "Documentation", "Landing page"];

export default function AgentsWorkflowPage() {
  const [nodes, setNodes] = useState<Node[]>(defaultNodes);
  const [edges, setEdges] = useState<Edge[]>(defaultEdges);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [selNodeId, setSelNodeId] = useState<string | null>("guard");
  const [hasDefaulted, setHasDefaulted] = useState(false);

  // Form State
  const [form, setForm] = useState<JobCreateRequest>({
    topic: "",
    audience: "",
    goal: "",
    tone: "Professional",
    platform: "Blog",
  });

  const { data: jobs } = useJobs();

  // Pick up job ID passed from New Content Job page
  const { view, clearAgentJobId } = useAppNavigation();
  useEffect(() => {
    if (view.agentJobId && view.agentJobId !== activeJobId) {
      setNodes(defaultNodes);
      setEdges(defaultEdges);
      setActiveJobId(view.agentJobId);
      setHasDefaulted(true);
      clearAgentJobId();
    }
  }, [view.agentJobId]);

  // Default to the latest job if no active job is selected on load
  useEffect(() => {
    if (!activeJobId && jobs && jobs.length > 0 && !hasDefaulted) {
      setActiveJobId(jobs[0].id);
      setHasDefaulted(true);
    }
  }, [jobs, activeJobId, hasDefaulted]);

  const createJob = useCreateJob();
  const { events, connected, done } = useJobEvents(activeJobId ?? "", !!activeJobId);
  const { data: jobDetails } = useJob(activeJobId ?? "");
  const { data: results } = useJobResults(activeJobId ?? "");

  const wasStreaming = useRef(false);
  useEffect(() => {
    if (connected) {
      wasStreaming.current = true;
    }
  }, [connected]);

  useEffect(() => {
    if (!activeJobId || !jobDetails || !done) return;
    if (wasStreaming.current) {
      wasStreaming.current = false;
      if (jobDetails.status === "REJECTED") {
        toast.warning("Job rejected by the guard agent", {
          description: jobDetails.rejection_reason ?? "Topic violates guidelines.",
        });
      } else if (jobDetails.status === "FAILED") {
        toast.error("Pipeline failed!", {
          description: jobDetails.rejection_reason ?? "An internal pipeline error occurred.",
        });
      } else if (jobDetails.status === "DONE") {
        toast.success("Pipeline completed successfully!");
      }
    }
  }, [jobDetails?.status, done, activeJobId]);

  // Sync loaded job details into the form so the user sees the active job's inputs
  useEffect(() => {
    if (!jobDetails) return;
    setForm({
      topic: jobDetails.topic,
      audience: jobDetails.audience,
      goal: jobDetails.goal,
      tone: jobDetails.tone,
      platform: jobDetails.platform,
    });
  }, [jobDetails?.id]);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const updateForm = (key: keyof JobCreateRequest, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
  };

  const isRunning = activeJobId ? !done : false;

  const handleStartSwarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.topic.trim() || !form.audience.trim() || !form.goal.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      // Reset visualizer state
      setNodes(defaultNodes);
      setEdges(defaultEdges);
      setActiveJobId(null);

      const job = await createJob.mutateAsync({
        topic: form.topic.trim(),
        audience: form.audience.trim(),
        goal: form.goal.trim(),
        tone: form.tone,
        platform: form.platform,
      });

      toast.success("Pipeline started! Listening to agent events...");
      setActiveJobId(job.id);
    } catch (err) {
      toast.error("Failed to kick off agent swarm.");
    }
  };

  // Sync SSE Events to Node/Edge states
  useEffect(() => {
    if (!events || events.length === 0) return;

    const statusMap: Record<string, "idle" | "running" | "completed" | "failed"> = {
      guard: "idle",
      research: "idle",
      competitor: "idle",
      gap: "idle",
      strategy: "idle",
      writer: "idle",
      evaluator: "idle",
    };

    const stageKeyMap: Record<string, string> = {
      GUARD: "guard",
      RESEARCH: "research",
      COMPETITOR: "competitor",
      GAP: "gap",
      STRATEGY: "strategy",
      WRITER: "writer",
      EVALUATOR: "evaluator",
    };

    events.forEach((ev) => {
      const nid = stageKeyMap[ev.stage];
      if (!nid) return;
      if (ev.status === "RUNNING") statusMap[nid] = "running";
      else if (ev.status === "COMPLETED" || ev.status === "SKIPPED") statusMap[nid] = "completed";
      else if (ev.status === "FAILED") statusMap[nid] = "failed";
    });

    setNodes((prevNodes) =>
      prevNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          status: statusMap[n.id],
        },
      }))
    );

    // Update edge states based on source/target node states
    setEdges((prevEdges) =>
      prevEdges.map((edge) => {
        const sStatus = statusMap[edge.source];
        const tStatus = statusMap[edge.target];

        let edgeStatus: "completed" | "running" | "idle" = "idle";
        if (sStatus === "completed" && tStatus === "completed") {
          edgeStatus = "completed";
        } else if (sStatus === "completed" && tStatus === "running") {
          edgeStatus = "running";
        }

        return {
          ...edge,
          animated: edgeStatus === "running",
          style: getEdgeStyle(edgeStatus),
        };
      })
    );
  }, [events]);

  // Node Output mapping
  const nodeOutput = useMemo(() => {
    if (!results) return null;
    const outputs: Record<string, any> = {
      guard: results.request_profile,
      research: results.research,
      competitor: results.competitor,
      gap: results.gaps,
      strategy: results.strategy,
      writer: results.draft ? { title: results.draft.title, word_count: results.draft.word_count, sections: results.draft.sections } : null,
      evaluator: results.evaluation,
    };
    return outputs[selNodeId ?? "guard"] || null;
  }, [results, selNodeId]);

  const outputString = useMemo(() => {
    if (!nodeOutput) return "";
    return JSON.stringify(nodeOutput, null, 2);
  }, [nodeOutput]);

  const selectedNodeMetadata = useMemo(() => {
    const defaultMeta = {
      guard: { label: "Guard Agent", desc: "Safety checks, content filtering, and validation of request profile." },
      research: { label: "Research Agent", desc: "Performs real-time web searches to aggregate knowledge on the topic." },
      competitor: { label: "Competitor Agent", desc: "Scrapes competitor topics and performs initial keyword optimization." },
      gap: { label: "Gap Analysis Agent", desc: "Analyzes content gaps and determines high-impact content opportunities." },
      strategy: { label: "Strategy Agent", desc: "Creates the final outline and strategic SEO brief for the content draft." },
      writer: { label: "Writer Agent", desc: "Generates the draft content utilizing context from all prior stages." },
      evaluator: { label: "Evaluator Agent", desc: "Runs final scoring and outputs readiness assessments." },
    };
    return defaultMeta[selNodeId as keyof typeof defaultMeta] || defaultMeta.guard;
  }, [selNodeId]);

  // Log events sorted descending
  const sortedLogs = useMemo(() => {
    return [...events].sort((a, b) => b.seq - a.seq);
  }, [events]);

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const handleNodeClick = (_e: any, node: Node) => {
    setSelNodeId(node.id);
  };

  // Copy helper
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!outputString) return;
    navigator.clipboard.writeText(outputString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] w-full gap-4 overflow-hidden">
      {/* Configuration Column */}
      <div className="flex w-[320px] flex-col rounded-xl border border-slate-800 bg-[#070b14]/70 p-4 backdrop-blur-md">
        <div className="mb-4">
          <h2 className="text-md font-bold text-white flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-orange-500" />
            Swarm Control Center
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">Configure inputs and trigger agent pipeline.</p>
        </div>

        {/* Dropdown to select job */}
        {jobs && jobs.length > 0 && (
          <div className="mb-4 space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Select Swarm Job</label>
            <select
              className="w-full rounded-lg border border-slate-800 bg-[#0b0f19] p-2 text-xs text-white focus:border-orange-500/50 focus:outline-none"
              value={activeJobId ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                setNodes(defaultNodes);
                setEdges(defaultEdges);
                if (id) {
                  setActiveJobId(id);
                } else {
                  setActiveJobId(null);
                  setForm({
                    topic: "",
                    audience: "",
                    goal: "",
                    tone: "Professional",
                    platform: "Blog",
                  });
                }
              }}
            >
              <option value="" className="bg-[#0b0f19] text-white">-- Start New Swarm --</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id} className="bg-[#0b0f19] text-white">
                  {j.topic.length > 30 ? `${j.topic.slice(0, 30)}...` : j.topic} ({j.status.toLowerCase()})
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleStartSwarm} className="flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Topic</label>
            <textarea
              placeholder="e.g. NextJS 15 optimization strategies"
              className="w-full rounded-lg border border-slate-800 bg-[#0b0f19] p-2 text-xs text-white placeholder-slate-600 focus:border-orange-500/50 focus:outline-none"
              rows={3}
              value={form.topic}
              onChange={(e) => updateForm("topic", e.target.value)}
              disabled={isRunning}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Audience</label>
            <input
              type="text"
              placeholder="e.g. Software engineers"
              className="w-full rounded-lg border border-slate-800 bg-[#0b0f19] p-2 text-xs text-white placeholder-slate-600 focus:border-orange-500/50 focus:outline-none"
              value={form.audience}
              onChange={(e) => updateForm("audience", e.target.value)}
              disabled={isRunning}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Goal</label>
            <input
              type="text"
              placeholder="e.g. Technical educational guide"
              className="w-full rounded-lg border border-slate-800 bg-[#0b0f19] p-2 text-xs text-white placeholder-slate-600 focus:border-orange-500/50 focus:outline-none"
              value={form.goal}
              onChange={(e) => updateForm("goal", e.target.value)}
              disabled={isRunning}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tone</label>
              <select
                className="w-full rounded-lg border border-slate-800 bg-[#0b0f19] p-2 text-xs text-white focus:border-orange-500/50 focus:outline-none"
                value={form.tone}
                onChange={(e) => updateForm("tone", e.target.value)}
                disabled={isRunning}
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Platform</label>
              <select
                className="w-full rounded-lg border border-slate-800 bg-[#0b0f19] p-2 text-xs text-white focus:border-orange-500/50 focus:outline-none"
                value={form.platform}
                onChange={(e) => updateForm("platform", e.target.value)}
                disabled={isRunning}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isRunning}
            className={cn(
              "w-full rounded-lg py-2.5 text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(249,115,22,0.15)]",
              isRunning
                ? "bg-slate-800 cursor-not-allowed text-slate-400"
                : "bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400"
            )}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                Pipeline running...
              </>
            ) : (
              <>
                <Sparkles className="h-4.5 w-4.5" />
                Execute Swarm
              </>
            )}
          </button>
        </form>

        {activeJobId && (
          <div className="mt-4 border-t border-slate-800 pt-3 flex items-center justify-between text-[10px] text-slate-400">
            <span>Job ID: {activeJobId.slice(0, 8)}...</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-bold uppercase",
                connected ? "bg-sky-500/10 text-sky-400" : done ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"
              )}
            >
              {connected ? "streaming" : done ? "finished" : "queued"}
            </span>
          </div>
        )}
      </div>

      {/* Visualizer & Outputs Column */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full">
        {/* ReactFlow Canvas container */}
        <div className="h-[55%] w-full rounded-xl border border-slate-800 bg-[#070b14]/40 relative overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.2}
            maxZoom={1.5}
          >
            <Background color="#1e293b" gap={20} size={1.5} />
            <Controls className="!border-slate-800 !bg-[#0f172a] !fill-white" />
          </ReactFlow>
          <div className="absolute top-3 left-3 bg-[#0d111d]/90 px-3 py-1.5 rounded-lg border border-slate-800 backdrop-blur pointer-events-none">
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Interactive Sandbox</span>
          </div>
        </div>

        {/* Console / Outputs Container */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Console Output */}
          <div className="w-[45%] rounded-xl border border-slate-800 bg-[#070b14]/70 flex flex-col overflow-hidden">
            <div className="px-3.5 py-2 border-b border-slate-800/80 bg-[#0b0f19] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Live Streams</span>
                <span className="text-[9px] font-mono text-zinc-500 bg-slate-800 px-1 rounded">{events.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isRunning ? "bg-orange-500" : "bg-slate-700")} />
                <span className="text-[9px] text-slate-500">{isRunning ? "Running" : "Idle"}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px] leading-relaxed space-y-1.5 scrollbar-hide bg-[#05080f]">
              {sortedLogs.length === 0 ? (
                <div className="flex items-center gap-1.5 text-slate-600 py-2 px-1">
                  <ChevronRight className="w-3 h-3" />
                  Waiting for events. Trigger swarm to view live console logs...
                </div>
              ) : (
                sortedLogs.map((ev) => (
                  <div key={ev.seq} className="flex items-start gap-2 px-1.5 py-1 rounded hover:bg-slate-900/50 transition-colors">
                    <span className="text-slate-600 shrink-0 tabular-nums">{fmtTime(ev.created_at)}</span>
                    <span
                      className={cn(
                        "shrink-0 font-bold px-1 rounded text-[9px]",
                        ev.status === "RUNNING"
                          ? "text-orange-400 bg-orange-950/20 border border-orange-500/10"
                          : ev.status === "COMPLETED"
                          ? "text-emerald-400 bg-emerald-950/20 border border-emerald-500/10"
                          : "text-red-400 bg-red-950/20"
                      )}
                    >
                      {ev.stage}
                    </span>
                    <span className={cn("truncate", ev.status === "FAILED" ? "text-red-300" : "text-slate-400")}>
                      {ev.status.toLowerCase()}{ev.detail ? ` → ${ev.detail}` : ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Inspector Output */}
          <div className="w-[55%] rounded-xl border border-slate-800 bg-[#070b14]/70 flex flex-col overflow-hidden">
            <div className="px-3.5 py-2 border-b border-slate-800/80 bg-[#0b0f19] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Node Output Inspector</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#05080f]">
              {/* Selected Node Details */}
              <div className="flex items-start gap-3 pb-3 border-b border-slate-800/80">
                <div
                  className="p-2 rounded-lg border shrink-0"
                  style={{ backgroundColor: `${AGENT_COLORS[selNodeId ?? "guard"]}10`, borderColor: `${AGENT_COLORS[selNodeId ?? "guard"]}30`, color: AGENT_COLORS[selNodeId ?? "guard"] }}
                >
                  {selNodeId && ICONS[selNodeId === "evaluator" ? "checkCircle" : selNodeId === "gap" ? "activity" : selNodeId] && (
                    (() => {
                      const NodeIcon = ICONS[selNodeId === "evaluator" ? "checkCircle" : selNodeId === "gap" ? "activity" : selNodeId];
                      return <NodeIcon className="w-4 h-4" />;
                    })()
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-200">{selectedNodeMetadata.label}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">{selectedNodeMetadata.desc}</p>
                </div>
              </div>

              {/* JSON Output Viewer */}
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Structured output</span>
                  {outputString && (
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 text-[9px] text-slate-400 hover:text-white transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5" />
                          Copy
                        </>
                      )}
                    </button>
                  )}
                </div>

                {outputString ? (
                  <div className="relative rounded-lg border border-slate-800/80 bg-[#080c14] p-3 max-h-[160px] overflow-y-auto">
                    <pre className="text-[9px] font-mono text-slate-400 leading-relaxed overflow-x-auto whitespace-pre-wrap">{outputString}</pre>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-800/80 bg-[#080c14] p-6 text-center flex flex-col items-center justify-center h-[120px]">
                    <Circle className="w-5 h-5 text-slate-700 mb-1.5 stroke-dashed" />
                    <p className="text-[10px] text-slate-500">No output data available for this node. Run the pipeline to populate.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
