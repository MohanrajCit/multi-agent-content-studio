// Wire types mirroring the backend API contracts (app/api/schemas.py).

export type JobStatus =
  | "QUEUED"
  | "VALIDATING"
  | "RESEARCHING"
  | "STRATEGIZING"
  | "WRITING"
  | "EVALUATING"
  | "DONE"
  | "REJECTED"
  | "FAILED";

export type StageName =
  | "GUARD"
  | "RESEARCH"
  | "COMPETITOR"
  | "GAP"
  | "STRATEGY"
  | "WRITER"
  | "EVALUATOR";

export type RunStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED";

export type DraftOrigin = "PIPELINE" | "SECTION_REGEN" | "MANUAL_EDIT";

export interface JobCreateRequest {
  topic: string;
  audience: string;
  goal: string;
  tone: string;
  platform: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  topic: string;
  audience: string;
  goal: string;
  tone: string;
  platform: string;
  publish_score: number | null;
  rejection_reason: string | null;
  current_version: number | null;
  created_at: string;
}

export interface StageEvent {
  seq: number;
  stage: StageName;
  status: RunStatus;
  detail: string | null;
  created_at: string;
}

export interface JobStatusView {
  id: string;
  status: JobStatus;
  publish_score: number | null;
  rejection_reason: string | null;
  events: StageEvent[];
}

export interface DraftSection {
  section_id: string;
  heading: string;
  content: string;
  word_count: number;
}

export interface DraftSummary {
  version: number;
  origin: DraftOrigin;
  parent_version: number | null;
  is_current: boolean;
  title: string | null;
  word_count: number;
  regen_section_id: string | null;
  regen_instruction: string | null;
  created_at: string;
}

export interface DraftDetail extends DraftSummary {
  meta_description: string;
  sections: DraftSection[];
}

// ── domain contract shapes (JSONB payloads surfaced verbatim) ──
export interface SearchTrend {
  term: string;
  rationale: string;
}
export interface PeopleAlsoAsk {
  question: string;
  intent: string;
}
export interface SourceLink {
  title: string;
  url: string;
  snippet: string;
}
export interface ResearchReport {
  summary: string;
  trends: SearchTrend[];
  related_searches: string[];
  people_also_ask: PeopleAlsoAsk[];
  sources: SourceLink[];
  primary_keywords: string[];
}

export interface CompetitorProfile {
  url: string;
  title: string;
  headings: string[];
  topics_covered: string[];
  strengths: string[];
  weaknesses: string[];
}
export interface CompetitorAnalysis {
  summary: string;
  competitors: CompetitorProfile[];
  commonly_covered_topics: string[];
  differentiation_opportunities: string[];
}

export interface ContentGap {
  topic: string;
  opportunity: string;
  priority: number;
  suggested_angle: string;
}
export interface ContentGapReport {
  summary: string;
  missing_topics: ContentGap[];
  unique_opportunities: string[];
  recommended_focus: string;
}

export interface KeywordPlan {
  primary: string[];
  secondary: string[];
  long_tail: string[];
}
export interface OutlineSection {
  section_id: string;
  heading: string;
  key_points: string[];
  target_keywords: string[];
  estimated_words: number;
}
export interface ContentStrategy {
  brief: string;
  search_intent: string;
  title: string;
  keyword_plan: KeywordPlan;
  outline: OutlineSection[];
  tone_guidelines: string;
}

export interface DimensionScore {
  score: number;
  rationale: string;
  suggestions: string[];
}
export interface EvaluationReport {
  seo: DimensionScore;
  readability: DimensionScore;
  structure: DimensionScore;
  trustworthiness: DimensionScore;
  audience_match: DimensionScore;
  summary: string;
  publish_readiness: number;
}

export interface RequestProfile {
  is_valid: boolean;
  rejection_reason: string | null;
  injection_detected: boolean;
  topic: string;
  audience: string;
  goal: string;
  tone: string;
  platform: string;
  normalized_keywords: string[];
  notes: string | null;
}

export interface JobResults {
  id: string;
  status: JobStatus;
  request_profile: RequestProfile | null;
  research: ResearchReport | null;
  competitor: CompetitorAnalysis | null;
  gaps: ContentGapReport | null;
  strategy: ContentStrategy | null;
  draft: DraftDetail | null;
  evaluation: EvaluationReport | null;
}

export interface SectionRegenRequest {
  section_id: string;
  instruction: string;
}

export interface ApiErrorEnvelope {
  error: { code: string; message: string; details?: unknown };
}
