# Python Backend Architecture

This document describes the architecture of the Python backend service, which powers the AI-driven features including the Update Chat system, Goal Review Expert Council, and Activity Extraction pipeline.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Directory Structure](#directory-structure)
- [Update Chat System](#update-chat-system)
- [Goal Review Expert Council](#goal-review-expert-council)
- [Activity Extraction Pipeline](#activity-extraction-pipeline)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Production Considerations](#production-considerations)

---

## Overview

The Python backend is a **FastAPI-based service** powered by **LangGraph** and **Azure OpenAI (GPT-4o)**. It provides three main capabilities:

1. **Update Chat** - Conversational activity logging with intelligent clarification
2. **Goal Review** - Expert council system that evaluates goals from 11 perspectives
3. **Activity Extraction** - Structured parsing of free-form text into categorized activities

**Base URL:** `http://localhost:8000/api/v1`

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Web Framework | FastAPI | REST API with async support |
| AI Orchestration | LangGraph | Graph-based agent workflows |
| LLM Provider | Azure OpenAI (GPT-4o) | Language model inference |
| Validation | Pydantic | Request/response schemas |
| Server | Uvicorn | ASGI server |

---

## Directory Structure

```
src/assistant/
├── main.py                 # FastAPI application entrypoint
├── config.py               # Environment-based settings
├── agent/                  # LangGraph agent configuration
│   ├── agent.py            # React agent setup with tools
│   ├── llm.py              # Azure OpenAI LLM factory
│   └── callbacks.py        # Logging callback handlers
├── api/                    # API layer
│   ├── routes.py           # Router registration
│   ├── chat.py             # Commuter assistant chat
│   └── endpoints/
│       ├── goals.py        # Goal review & revision
│       └── updates.py      # Update parsing & extraction
├── tools/                  # Agent tools (commuter assistant)
│   ├── weather.py          # Weather lookup
│   ├── commute.py          # Commute time estimation
│   └── go_train.py         # GO Train schedules
├── schemas/                # Pydantic models
│   ├── chat.py             # Chat request/response
│   └── goals.py            # Goals & activities schemas
├── experts/                # Expert council definitions
│   └── __init__.py         # 11 expert personas
├── graphs/                 # LangGraph state graphs
│   └── expert_council.py   # Expert council workflow
└── docs/                   # Documentation
```

---

## Update Chat System

The Update Chat is a **conversational activity extraction system** that helps users log their work through natural conversation.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                          │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ VoiceTextInput│───▶│ UpdateWizard │───▶│ API Client   │       │
│  └──────────────┘    └──────────────┘    └──────┬───────┘       │
└─────────────────────────────────────────────────┼───────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Python Backend (FastAPI)                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              POST /api/v1/updates/chat                    │   │
│  │                                                           │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │   │
│  │  │ Session     │───▶│ LLM with    │───▶│ Response    │   │   │
│  │  │ Manager     │    │ 3-Level     │    │ Parser      │   │   │
│  │  │             │    │ Strategy    │    │             │   │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘   │   │
│  │        │                   │                   │          │   │
│  │        ▼                   ▼                   ▼          │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │            In-Memory Chat Sessions              │     │   │
│  │  │     Dict[session_id, List[ChatMessage]]         │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Three-Level Conversation Strategy

The system uses intelligent prompting to guide users through activity logging:

| Level | User Input Quality | System Response |
|-------|-------------------|-----------------|
| **Level 1** | Very vague ("busy day", "did stuff") | Ask for specifics, categories, learnings |
| **Level 2** | Partially complete (activities listed, no details) | Encourage + ask ONE soft follow-up |
| **Level 3** | Complete with details | Extract immediately, no questions |

**User Override Keywords:** "save as is", "done", "submit", "that's all", "no", "nope" → Extracts immediately

### Session Flow

```
1. User sends message with session_id
         │
         ▼
2. System retrieves/creates chat history
         │
         ▼
3. LLM evaluates completeness (3-level strategy)
         │
         ├── Incomplete ──▶ Return clarifying question
         │                  (needs_clarification: true)
         │
         └── Complete ────▶ Extract activities
                           │
                           ▼
                    4. Analyze for follow-ups (2nd LLM call)
                           │
                           ├── No follow-ups ──▶ Return activities
                           │
                           └── Follow-ups found ──▶ Store pending + ask user
                                                    (awaiting_followup_confirmation: true)
```

### Follow-Up Proposal System

The Update Chat includes an intelligent follow-up proposal system that identifies activities that would benefit from future reminders.

#### Orchestration Flow (Multi-LLM Architecture)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UPDATE CHAT ORCHESTRATION                           │
│                                                                             │
│  User Message                                                               │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              LLM CALL 1: CONVERSATION ORCHESTRATOR                   │   │
│  │                                                                      │   │
│  │  System Prompt: 3-level conversation strategy                        │   │
│  │  - Level 1 (Vague): Ask for details                                  │   │
│  │  - Level 2 (Moderate): Soft follow-up question                       │   │
│  │  - Level 3 (Complete): Extract as JSON                               │   │
│  │                                                                      │   │
│  │  Output: Clarifying question OR JSON with activities                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       ├── Clarifying Question ──▶ Return to user (loop continues)          │
│       │                                                                     │
│       └── Activities Extracted                                              │
│               │                                                             │
│               ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              LLM CALL 2: FOLLOW-UP ANALYZER                          │   │
│  │                                                                      │   │
│  │  Input: List of extracted activities                                 │   │
│  │  Analysis Criteria:                                                  │   │
│  │  - Project indicators (large initiatives, multi-phase work)          │   │
│  │  - Activity-specific (experiments → check results, demos → feedback) │   │
│  │  - Value-maximizing (documentation, dependencies, stakeholders)      │   │
│  │                                                                      │   │
│  │  Output: Proposed follow-ups with titles, summaries, suggested days  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       ├── No Follow-ups ──▶ Return activities to user                      │
│       │                                                                     │
│       └── Follow-ups Proposed                                               │
│               │                                                             │
│               ▼                                                             │
│       Store in pending_follow_ups[session_id]                               │
│       Return message with proposals + "Would you like to save?"             │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  User Response (to follow-up question)                                      │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              LLM CALL 3: CONFIRMATION DETECTOR                       │   │
│  │                                                                      │   │
│  │  Input: User message + list of pending proposals                     │   │
│  │  Interpretation:                                                     │   │
│  │  - "yes", "sure" → approve ALL                                       │   │
│  │  - "no", "skip" → dismiss ALL                                        │   │
│  │  - "save the first one" → selective approval                         │   │
│  │  - Unrelated message → not a confirmation (continue conversation)    │   │
│  │                                                                      │   │
│  │  Output: is_confirmation, approved_indices, dismissed_indices        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       ├── Not Confirmation ──▶ Process as new message (restart flow)       │
│       │                                                                     │
│       └── Confirmation ──▶ Return approved/dismissed to Next.js for save   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Follow-Up Worthy Activities

The analyzer identifies activities based on these criteria:

| Activity Type | Follow-Up Suggestions |
|---------------|----------------------|
| `experiments` | Check results, document learnings, share findings |
| `product_demos` | Gather feedback, track customer interest |
| `mentoring` | Check mentee progress, schedule next session |
| `presentations` | Collect audience feedback, share materials |
| `research_learning` | Apply learnings to work, share knowledge |
| `general_task` | Only if part of larger initiative |

**Project Indicators** (High Priority):
- Keywords: "2.0", "new version", "redesign", "migration", "roadmap"
- Multi-phase or multi-week initiatives
- Cross-team or strategic work

#### State Management

```python
# In-memory storage (TODO: move to Redis)
chat_sessions: Dict[str, List[dict]] = {}      # Chat history per session
pending_follow_ups: Dict[str, dict] = {}       # Pending proposals per session

# Pending follow-up structure
{
    "proposals": [
        {
            "activity_index": 0,
            "activity_type": "experiments",
            "title": "Check experiment results",
            "summary": "Review A/B test outcomes",
            "suggested_days": 7
        }
    ],
    "activities": [...],           # Original extracted activities
    "raw_summary": "...",          # Original summary
    "awaiting_confirmation": True  # Flag for confirmation detection
}
```

#### Response Schema Extensions

When follow-ups are proposed:
```json
{
  "session_id": "...",
  "assistant_message": "Got it! I've extracted 2 activities...\n\nI noticed some activities that might benefit from follow-up:\n\n- **Check results** (in ~7 days): ...",
  "needs_clarification": false,
  "activities": [...],
  "proposed_follow_ups": [
    {
      "activity_index": 0,
      "activity_type": "experiments",
      "title": "Check experiment results",
      "summary": "Review outcomes and document learnings",
      "suggested_days": 7
    }
  ],
  "awaiting_followup_confirmation": true
}
```

When user confirms:
```json
{
  "followup_confirmation_result": {
    "approved_indices": [0, 1],
    "dismissed_indices": [],
    "session_id": "..."
  }
}
```

### Activity Categories

The system extracts activities into 7 predefined categories:

| Category | Description | Example |
|----------|-------------|---------|
| `experiments` | Research, A/B tests, prototypes | "Ran 2 checkout experiments" |
| `product_demos` | Product showcases, client demos | "Demoed new feature to sales" |
| `mentoring` | Coaching, knowledge transfer | "Mentored 2 junior devs" |
| `presentations` | Talks, workshops, training | "Gave 1 engineering talk" |
| `volunteering` | Community work, charity | "Volunteered at local nonprofit" |
| `general_task` | Work tasks, meetings, planning | "Attended 3 planning meetings" |
| `research_learning` | Learning, courses, reading | "Completed 1 course on React" |

### Request/Response Schema

**Request:**
```json
{
  "session_id": "uuid-string",
  "user_message": "I worked on experiments today",
  "user_timezone": "America/Toronto"
}
```

**Response (needs clarification):**
```json
{
  "session_id": "uuid-string",
  "assistant_message": "Great! Can you tell me more about those experiments?",
  "needs_clarification": true,
  "activities": [],
  "raw_summary": "",
  "chat_history": [
    {"role": "user", "content": "I worked on experiments today"},
    {"role": "assistant", "content": "Great! Can you tell me more..."}
  ]
}
```

**Response (extraction complete):**
```json
{
  "session_id": "uuid-string",
  "assistant_message": "Got it! I've recorded your activities.",
  "needs_clarification": false,
  "activities": [
    {
      "activity_type": "experiments",
      "quantity": 2,
      "summary": "Ran A/B tests on checkout flow",
      "activity_date": "2024-01-15"
    }
  ],
  "raw_summary": "Worked on checkout experiments",
  "chat_history": [...]
}
```

---

## Goal Review Expert Council

The Expert Council is a **LangGraph-based multi-agent system** that evaluates goals from 11 specialized perspectives.

### Architecture Diagram

```
                         START
                           │
                           ▼
                   ┌───────────────┐
                   │  ORCHESTRATOR │
                   │ (validate LLM)│
                   └───────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   BATCH 0   │ │   BATCH 1   │ │   BATCH 2   │
    │ (4 experts) │ │ (4 experts) │ │ (3 experts) │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           │    Sequential batch execution │
           │               │               │
           └───────────────┼───────────────┘
                           │
                           ▼
                   ┌───────────────┐
                   │  SYNTHESIZER  │
                   │ (combine LLM) │
                   └───────┬───────┘
                           │
                           ▼
                          END
```

### The 11 Experts

| # | Expert | Focus | Key Perspectives |
|---|--------|-------|------------------|
| 1 | **Strategist** ♟️ | Long-term planning | Vision, alignment, opportunity cost |
| 2 | **Motivator** 🔥 | Inspiration & momentum | Emotional connection, intrinsic motivation |
| 3 | **Obstacle Analyst** 🔍 | Risk & mitigation | Roadblocks, failure modes, contingency |
| 4 | **Progress Tracker** 📊 | Metrics & measurability | KPIs, leading/lagging indicators |
| 5 | **Skill Advisor** 🎓 | Learning requirements | Skill gaps, development pathways |
| 6 | **Time Optimizer** ⏰ | Timeline feasibility | Realistic schedules, prioritization |
| 7 | **Wellness Guide** 🌿 | Sustainability & balance | Health impact, burnout prevention |
| 8 | **Accountability Partner** 🤝 | Follow-through | Commitment devices, check-ins |
| 9 | **Resource Planner** 💰 | Budget & resources | Financial needs, tools, human resources |
| 10 | **Milestone Designer** 🗺️ | Goal breakdown | Phases, sequencing, quick wins |
| 11 | **Success Definer** 🏆 | Outcome clarity | Success criteria, "done" definition |

### LangGraph State

```python
class CouncilState(TypedDict):
    goal_id: str
    title: str
    description: str
    target_date: str
    llm: Any                              # Shared LLM instance
    expert_results: Annotated[list, add]  # Accumulated via reducer
    overall_score: float
    summary: str
```

### Execution Flow

1. **Orchestrator Node** - Validates input, creates shared LLM
2. **Batch Nodes (0, 1, 2)** - Execute experts in parallel within batches
3. **Synthesizer Node** - Combines all feedback via LLM into summary

**Batch Composition:**
- Batch 0: Strategist, Motivator, Obstacle Analyst, Progress Tracker
- Batch 1: Skill Advisor, Time Optimizer, Wellness Guide, Accountability Partner
- Batch 2: Resource Planner, Milestone Designer, Success Definer

---

## Activity Extraction Pipeline

For non-conversational extraction, there's a direct parsing endpoint.

### Endpoint: POST /api/v1/updates/extract-activities

Extracts structured activities from free-form text in a single LLM call.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Raw Text    │────▶│  LLM Parse   │────▶│  Structured  │
│  Input       │     │  + Extract   │     │  Activities  │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Request:**
```json
{
  "raw_text": "Today I ran 2 experiments and mentored a junior dev",
  "user_timezone": "America/Toronto"
}
```

**Response:**
```json
{
  "activities": [
    {
      "activity_type": "experiments",
      "quantity": 2,
      "summary": "Ran experiments",
      "activity_date": "2024-01-15"
    },
    {
      "activity_type": "mentoring",
      "quantity": 1,
      "summary": "Mentored junior developer",
      "activity_date": "2024-01-15"
    }
  ],
  "raw_summary": "Ran experiments and mentored"
}
```

---

## API Reference

### Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/chat` | Commuter assistant chat |
| `POST` | `/api/v1/goals/review` | Expert council goal review |
| `POST` | `/api/v1/goals/revise` | AI-powered goal revision |
| `POST` | `/api/v1/updates/parse` | Goal-focused update parsing |
| `POST` | `/api/v1/updates/extract-activities` | Direct activity extraction |
| `POST` | `/api/v1/updates/chat` | Conversational extraction |
| `DELETE` | `/api/v1/updates/chat/{session_id}` | Clear chat session |

### Common Patterns

**LLM Integration:**
```python
async def endpoint(request):
    llm = create_llm()  # Azure OpenAI factory

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_input}
    ]

    response = await llm.ainvoke(messages)
    result = parse_llm_json(response.content)

    return Response(**result)
```

**JSON Parsing:**
The `parse_llm_json()` helper handles LLM responses wrapped in markdown code blocks.

---

## Configuration

Environment variables (via `.env` file):

```bash
# Azure OpenAI (required)
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-08-01-preview

# Server (optional)
HOST=0.0.0.0
PORT=8000
DEBUG=false

# CORS (optional)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

---

## Production Considerations

### Current Limitations (Development)

| Component | Current | Production Recommendation |
|-----------|---------|---------------------------|
| Chat Sessions | In-memory dict | Redis or PostgreSQL |
| Agent Memory | MemorySaver (in-memory) | PostgresSaver or RedisSaver |
| Weather Data | Mock data | OpenWeatherMap API |
| Commute Data | Mock data | Google Maps API |
| GO Train Data | Mock data | GO Transit API |

### Scaling Recommendations

1. **Horizontal Scaling** - Stateless design allows multiple instances
2. **Session Persistence** - Move to Redis for distributed sessions
3. **Rate Limiting** - Add per-user rate limits for LLM calls
4. **Caching** - Cache expert council results for similar goals
5. **Monitoring** - Add OpenTelemetry tracing for LLM calls

### Error Handling

- Failed expert evaluations return score=5 with fallback feedback
- LLM parsing failures return graceful error messages
- All endpoints return structured error responses

---

## Development

### Running Locally

```bash
# Install dependencies (uses uv)
pnpm python:install

# Start development server
pnpm python:dev

# Or directly with uvicorn
cd packages/python-backend
uv run uvicorn src.assistant.main:app --reload --port 8000
```

### Testing

```bash
# Run tests
cd packages/python-backend
uv run pytest

# Lint
uv run ruff check .
```

### Type Generation

```bash
# Generate TypeScript types from Python schemas
pnpm generate:types
```
