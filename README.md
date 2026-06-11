<h1 align="center">AI Content Intelligence Studio</h1>

<p align="center">
  <strong>Multi-agent AI platform that researches, strategizes, writes, and evaluates publication-ready content — end to end.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.11+-3776AB?logo=python&logoColor=white" alt="Python 3.11+" />
  <img src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/CrewAI-1.14+-FF6B35?logo=data:image/svg+xml;base64,&logoColor=white" alt="CrewAI" />
  <img src="https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License" />
</p>

---

## 📖 Overview

**AI Content Intelligence Studio** is a full-stack, enterprise-grade AI application that orchestrates **7 specialized autonomous AI agents** across a **5-stage pipeline**. Give it a topic, target audience, and desired tone, and it will perform live internet research, scrape competitors, identify content gaps, strategize an outline, draft the content, and formally evaluate its quality.

Unlike simple wrapper apps, this studio leverages **CrewAI Flows** to enforce strict Pydantic schemas at every boundary, utilizing a powerful dual-validation system (Semantic Guardrails + Structured Outputs) to ensure the LLM never hallucinates formats.

---

## 🌟 The Novelty

Most AI writing tools are "thin wrappers" around a single LLM prompt. AI Content Intelligence Studio is fundamentally different:

1. **DAG Workflow Orchestration**: Instead of relying on a single mega-prompt, the platform uses a Directed Acyclic Graph (DAG) flow. Each agent is strictly confined to one job (e.g., the Writer cannot write until the Gap Analyst and Strategist have finished their research).
2. **True Internet Intelligence**: It doesn't rely on stale pre-training data. It dynamically searches Google (via Serper) and scrapes the actual DOM of top-ranking competitor articles (via Firecrawl) to find factual gaps *before* drafting.
3. **Dual Validation System**: Every handoff between agents is strictly typed via Pydantic (`output_pydantic`). If the LLM generates an invalid schema, Semantic Guardrails catch the error and automatically force the LLM to self-correct and retry.
4. **LLM Agnostic Engine**: The core code is completely decoupled from any specific AI provider. You can seamlessly route the entire platform's "brain" through Groq, OpenRouter, or Gemini natively by flipping a single environment variable.

---

## 👥 Who is this for?

This platform is built for professionals who require high-quality, deeply researched content at scale:

* **B2B SaaS Founders & Indie Hackers**: Generate highly technical, authoritative blog posts and landing page copy without hiring expensive technical writers.
* **Content Marketing Teams**: Automate the tedious, hours-long process of SEO competitor analysis and keyword gap research.
* **SEO Agencies**: Produce deeply researched, data-backed articles designed to outrank specific SERP competitors.
* **Technical Writers**: Use the pipeline to quickly scaffold out comprehensive documentation based on current industry standards.

---

## 🤝 Human-in-the-Loop (HITL)

The AI is designed to do 90% of the heavy lifting, but **humans always retain ultimate creative control.** The platform features a sophisticated Human-in-the-Loop interface:

* **Draft Editor**: The AI's final draft isn't locked. Users can manually edit, tweak, and refine the article in a rich text environment.
* **Surgical Section Regeneration**: Don't like how the AI wrote the "Conclusion" or "Introduction"? Select just that specific section and ask the Writer Agent to regenerate it with custom instructions (e.g., *"Make this section punchier and add a joke"*).
* **Version Control & Compare**: Every time a draft is edited or regenerated, the system automatically versions it. A side-by-side "Version Compare" UI allows editors to safely experiment with different tones and roll back to previous iterations instantly.

---

## ✨ Core Features

### 🤖 The 7-Agent Pipeline
The platform utilizes specialized agents, each with a distinct role:
1. **Guard Agent**: Validates user inputs and prevents malicious or nonsensical prompts.
2. **Research Agent**: Uses the Serper API to crawl Google for real-time market trends and data.
3. **Competitor Agent**: Uses the Firecrawl API to extract and analyze top-ranking competitor articles.
4. **Gap Analyst Agent**: Cross-references research with competitor data to find missing information angles.
5. **Strategist Agent**: Formulates a complete, SEO-optimized outline with per-section word counts.
6. **Writer Agent**: Drafts the actual content adhering strictly to the Strategist's outline.
7. **Quality Evaluator**: Scores the final draft out of 100 on 5 distinct dimensions (SEO, Readability, Structure, Trustworthiness, Audience Match).

### 🎯 Customization Parameters
When creating a job, users have granular control over the output via dynamic drop-downs:
* **Platforms**: `Blog`, `LinkedIn`, `Twitter/X`, `Newsletter`, `Documentation`, `Landing page`
* **Tones**: `Professional`, `Conversational`, `Authoritative`, `Friendly`, `Technical`, `Playful`

### 🛡️ Rate-Limit Resilience (Exponential Backoff)
Free-tier LLM providers (like Groq, OpenRouter, and Gemini) have strict Tokens Per Minute (TPM) limits. This platform includes a custom `BaseHTTPClient` that implements **Intelligent Exponential Backoff**. If the pipeline exhausts its token quota (Status 429), it automatically pauses, waits across a 90-second window until the next minute resets, and flawlessly resumes the pipeline without crashing.

### ⚡ Real-Time Frontend (Next.js 15)
* **Live SSE Streams**: Watch the agents work in real-time as Server-Sent Events stream pipeline status directly to the UI.

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        Next.js 15 Frontend                         │
│        Dashboard · Job Creation · Timeline · Draft Editor          │
│              Version Compare · Quality Scores · SSE                │
└─────────────────────┬───────────────────────────────────────────────┘
                      │ REST + SSE
┌─────────────────────▼───────────────────────────────────────────────┐
│                     FastAPI Backend (Python 3.11+)                   │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │ API Layer│→ │ Job Service  │→ │    CrewAI Flow Engine        │  │
│  │ (routers)│  │ (orchestrate)│  │                              │  │
│  └──────────┘  └──────────────┘  │  ┌───────┐  ┌───────────┐   │  │
│                                  │  │ Guard │→ │ Research  │   │  │
│  ┌──────────┐  ┌──────────────┐  │  └───────┘  │ Crew      │   │  │
│  │ Schemas  │  │ Stage Store  │  │             │┌──────────┐│   │  │
│  │ (DTOs)   │  │ (persistence)│  │             ││Research  ││   │  │
│  └──────────┘  └──────────────┘  │             ││Competitor││   │  │
│                                  │             │└──────────┘│   │  │
│  ┌──────────────────────────┐    │  ┌──────────▼──────────┐ │   │  │
│  │   Domain Models (7)      │    │  │ Strategy Crew       │ │   │  │
│  │ RequestProfile           │    │  │ ┌─────┐ ┌─────────┐│ │   │  │
│  │ ResearchReport           │    │  │ │ Gap │ │Strategist││ │   │  │
│  │ CompetitorAnalysis       │    │  │ └─────┘ └─────────┘│ │   │  │
│  │ ContentGapReport         │    │  └──────────┬─────────┘ │   │  │
│  │ ContentStrategy          │    │  ┌──────────▼─────────┐ │   │  │
│  │ DraftArticle             │    │  │ Content Crew       │ │   │  │
│  │ EvaluationReport         │    │  │ ┌────────┐         │ │   │  │
│  └──────────────────────────┘    │  │ │ Writer │         │ │   │  │
│                                  │  │ └────────┘         │ │   │  │
│  ┌───────────────────────────┐   │  └──────────┬─────────┘ │   │  │
│  │   Integrations            │   │  ┌──────────▼─────────┐ │   │  │
│  │ ┌────────┐ ┌───────────┐  │   │  │ Quality Crew       │ │   │  │
│  │ │ Gemini │ │ Serper    │  │   │  │ ┌──────────┐       │ │   │  │
│  │ │OpenRtr │ │ Firecrawl │  │   │  │ │Evaluator │       │ │   │  │
│  │ │Groq    │ │           │  │   │  │ └──────────┘       │ │   │  │
│  │ └────────┘ └───────────┘  │   │  └────────────────────┘ │   │  │
│  └───────────────────────────┘   └──────────────────────────────┘  │
│                                                                     │
│  ┌───────────────┐  ┌──────────────────────────────────────────┐   │
│  │  PostgreSQL   │  │  Redis (SSE pub/sub · ARQ job broker)    │   │
│  └───────────────┘  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Backend
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Core Framework** | FastAPI 0.115+ (Python 3.11+) | High-performance asynchronous API layer. |
| **Agent Orchestrator**| CrewAI 1.14+ | Defines agents, tasks, and stateful DAG flows. |
| **LLM Provider** | Configurable (`openrouter`, `gemini`) | Native OpenAI-compatible dynamic LLM routing. |
| **Search & Scrape** | Serper API & Firecrawl API | Fetches live Google results and raw HTML competitors. |
| **Database** | PostgreSQL 15+ (asyncpg / SQLAlchemy) | Persistent storage for all jobs and nested JSON data. |
| **Event Broker** | Redis 7+ | Handles SSE pub/sub architecture for live UI updates. |
| **Data Validation** | Pydantic v2 | Strictly types the schemas sent to the LLM (Structured Outputs). |

### Frontend
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Core Framework** | Next.js 15 (App Router) | React Server-Side Rendering and routing. |
| **Language** | TypeScript 5.7 | Strict type-safety matching backend schemas. |
| **Data Fetching** | TanStack React Query 5 | Client-side caching and server-state synchronization. |
| **UI Primitives** | Radix UI + Tailwind CSS 3 | Accessible, headless, utility-first premium UI design. |
| **Real-time Comms**| EventSource (SSE) | Listens to backend Redis channels for live progress dots. |

---

## ⚙️ Getting Started

### 1. Prerequisites
* **Python 3.11+**
* **Node.js 18+**
* **PostgreSQL 15+** (Running locally on port 5432)
* **Redis 7+** (Running locally on port 6379)

### 2. Environment Variables & API Keys
You will need API keys for the integrations. Get them here:
* [Groq Console](https://console.groq.com) (For ultra-fast LLM inference)
* [Serper](https://serper.dev) (For Google Search)
* [Firecrawl](https://firecrawl.dev) (For web scraping)

Clone the repo and set up the backend `.env`:
```bash
git clone https://github.com/your-username/ai-content-intelligence-studio.git
cd ai-content-intelligence-studio/backend

cp .env.example .env
```
Edit `.env` to include your keys. To use Groq via the OpenRouter adapter:
```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_groq_api_key_here
OPENROUTER_BASE_URL=https://api.groq.com/openai/v1
OPENROUTER_MODEL=llama-3.1-8b-instant
SERPER_API_KEY=your_serper_key_here
FIRECRAWL_API_KEY=your_firecrawl_key_here
```
*(Note: If using `response_format: {"type": "json_object"}`, our backend automatically appends the word "JSON" to prompts to satisfy Groq's strict API requirements).*

### 3. Initialize Database & Backend
```bash
cd backend
python -m venv .venv
# Activate: `source .venv/bin/activate` (Mac/Linux) or `.venv\Scripts\activate` (Windows)

pip install -e ".[dev]"
python scripts/init_db.py  # Creates all PostgreSQL tables

# Start the Backend Server
uvicorn app.main:app --reload --port 8000
```

### 4. Initialize Frontend
```bash
cd ../frontend
npm install

cp .env.local.example .env.local
# Start the Frontend Server
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## 🚦 API Reference

The backend exposes a clean RESTful interface that the Next.js app consumes:

### Jobs API
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/jobs` | Submits a new content brief and kicks off the background ARQ job. |
| `GET` | `/jobs` | Retrieves a list of all historical jobs. |
| `GET` | `/jobs/{id}/status` | Gets current stage status (e.g. `RESEARCH: COMPLETED`). |
| `GET` | `/jobs/{id}/events` | Establishes an SSE connection for live UI updates. |
| `GET` | `/jobs/{id}/results`| Returns the massive JSON tree containing all agent outputs. |

### Drafts API
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/jobs/{id}/drafts` | Gets the version history of the generated article. |
| `POST` | `/jobs/{id}/drafts/{v}/regenerate-section` | Triggers the Writer agent to rewrite a specific section (e.g., Make it funnier). |
| `POST` | `/jobs/{id}/drafts/{v}/restore` | Rolls back the timeline to a previous draft version. |

---

## 🐛 Troubleshooting & FAQ

**1. The pipeline instantly fails at the Validation stage with a 429 Error.**
This means your LLM API Key (Groq, OpenRouter, Gemini) is out of credits or has hit its Requests Per Minute (RPM) limit. Wait 60 seconds and try again, or switch to a lighter model (like `llama-3.1-8b-instant` for Groq) with higher free-tier limits.

**2. The pipeline finishes Drafting but fails at Quality Evaluation.**
The Quality Evaluator feeds the *entire* drafted article back into the LLM. If your draft is 3,000 words, this can exceed a 6,000 Tokens Per Minute (TPM) limit. Our built-in exponential backoff will attempt to wait up to 90 seconds to reset the minute boundary, but if it still fails, you may need to upgrade your LLM API tier. (Note: Your draft is still saved! Check the Draft tab).

**3. The configuration changes in `.env` aren't being picked up.**
If you are running `uvicorn app.main:app --reload` from outside the `backend` folder (e.g., from the root or frontend folder), the file watcher will not detect changes to `backend/.env`. Ensure you are inside the `backend/` directory when starting Uvicorn, or manually restart the server.

**4. Port 3000 or 8000 is already in use.**
If a previous instance crashed and left a "zombie" process running, kill it manually:
* Windows: `taskkill /F /IM node.exe` and `taskkill /F /IM python.exe`
* Mac/Linux: `pkill node` and `pkill python`

---

## 🤝 Contributing

We welcome contributions! Please follow our standardized conventional commits and ensure all 53 backend Pytest tests pass before submitting a Pull Request:
```bash
python -m pytest tests/ -q
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

<p align="center">
  Built with <a href="https://www.crewai.com">CrewAI</a> · <a href="https://fastapi.tiangolo.com">FastAPI</a> · <a href="https://nextjs.org">Next.js</a>
</p>
