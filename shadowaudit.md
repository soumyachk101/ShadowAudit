# ShadowAudit — Project Specification

> Proctoring Integrity Research & Auto-Detection System
> Single-file spec: PRD · TRD · App Flow · AI Instructions · UI/UX · Backend Schema
> Built for: 48-hour hackathon
> Stack: Next.js (frontend) · FastAPI (backend) · PostgreSQL · Claude API

---

## Table of Contents

1. [Product Requirements Document (PRD)](#1-product-requirements-document-prd)
2. [Technical Requirements Document (TRD)](#2-technical-requirements-document-trd)
3. [App Flow](#3-app-flow)
4. [AI Instructions](#4-ai-instructions)
5. [UI/UX Specification](#5-uiux-specification)
6. [Backend Schema](#6-backend-schema)
7. [48-Hour Build Plan](#7-48-hour-build-plan)
8. [Demo Script](#8-demo-script)
9. [Risk & Framing Notes](#9-risk--framing-notes)

---

## 1. Product Requirements Document (PRD)

### 1.1 Problem Statement

Online proctoring tools used for exams, certifications, and interviews rely on signals like webcam feed, tab-focus tracking, and screen-count detection. These signals can be spoofed using readily available techniques (virtual display drivers, focus-event suppression, hardware ID masking). Most deployed systems do not detect when their own signals have been tampered with — they trust the signal at face value.

This creates a silent integrity gap: exams are flagged as "clean" when they were not.

### 1.2 Goal

Build a system that:

1. Demonstrates a specific, narrow class of proctoring-signal tampering on a **self-built mock proctoring environment** (never against a real third-party product).
2. Detects that tampering in real time using a secondary signal the tampering technique does not account for.
3. Explains the detection in plain language using Claude, so a non-technical exam administrator understands what happened and why it matters.

### 1.3 Non-Goals

- This is **not** a tool to defeat any named commercial proctoring product.
- This is **not** released with the exact bypass technique as a public, reusable script.
- This is **not** a claim that the chosen vulnerability class is the only one that exists.

### 1.4 Target User (for framing purposes)

Exam administrators, EdTech platforms, and certification bodies who need confidence that "no flags raised" actually means "no tampering occurred" — not just "tampering wasn't visible to this particular signal."

### 1.5 Success Criteria (Demo-Level)

| Criterion | Target |
|---|---|
| Live bypass demonstrated on mock system | Undetected by baseline mode |
| Live detection demonstrated on same action | Flagged within 2 seconds, with plain-language explanation |
| Judges understand "before vs after" without technical background | Achieved via UI framing, not verbal explanation alone |
| No real third-party tool named/targeted | Confirmed in pitch + Q&A |

### 1.6 Core User Story

> "As an exam administrator, when a candidate tampers with their display configuration during a proctored session, I want to be alerted in real time with a clear explanation, instead of only seeing a clean session log."

---

## 2. Technical Requirements Document (TRD)

### 2.1 Architecture Overview

```
┌─────────────────────┐
│   Next.js Frontend   │  Mock exam UI + Live dashboard
│  (Candidate + Admin)  │
└──────────┬───────────┘
           │ WebSocket (real-time signal stream)
           │ REST (session start/end, history)
┌──────────▼───────────┐
│   FastAPI Backend     │  Signal ingestion, detection engine,
│                       │  Claude integration
└──────────┬───────────┘
           │
   ┌───────┴────────┐
   │                │
┌──▼─────┐    ┌─────▼──────┐
│Postgres│    │ Claude API │  Explanation generation
│ (logs) │    │            │
└────────┘    └────────────┘
```

### 2.2 Scope Lock (Single Vector)

**Chosen vector: Secondary display / virtual monitor spoofing.**

Rationale: highest visual demo value, cleanly scoped, does not require touching any real third-party software, and the detection signal is conceptually simple enough to explain in one sentence to judges.

Do not expand scope to tab-switching, gaze tracking, or audio spoofing — those are explicitly out of scope for this build.

### 2.3 Detection Signal (Conceptual, Not Implementation-Exact)

The baseline mock system only checks `navigator`/display-count APIs at face value. The detection layer instead correlates **multiple independent signals** (e.g., timing jitter in display-enumeration calls, mismatch between reported display count and rendering-context behavior) that a simple spoof typically does not patch consistently. The exact signal combination is implementation detail decided during the build — keep it in backend code and internal docs only, not in the pitch deck or public repo README.

### 2.4 Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Two views: Candidate (mock exam) + Admin (live dashboard) |
| Realtime | WebSocket (FastAPI native or `websockets` lib) | Streams signal events to dashboard |
| Backend | FastAPI | Signal ingestion, detection logic, Claude calls |
| DB | PostgreSQL | Session logs, signal events, flags |
| AI | Claude API (Sonnet) | Converts raw detection signal → human-readable alert text |
| Auth | Skip for hackathon | Single demo session, no multi-user auth needed |
| Hosting | Vercel (frontend) + Railway/Render (backend + Postgres) | Matches existing AXIOM project pattern |

### 2.5 Non-Functional Requirements

- Detection latency: under 2 seconds from tamper action to dashboard alert.
- Demo must work fully offline-tolerant for at least the local network (no dependency on judges' WiFi).
- No bypass code path should be reachable from a publicly deployed build without a local flag/env var enabled — disable the "tamper trigger" in any publicly shared deployment link.

---

## 3. App Flow

### 3.1 High-Level Flow

```
[Admin starts mock session]
        │
        ▼
[Candidate view loads — mock exam questions]
        │
        ▼
[Baseline Mode: candidate triggers tamper action]
        │
        ▼
[Mock exam continues uninterrupted — no flag raised]
        │
        ▼
[Admin switches to Protected Mode]
        │
        ▼
[Candidate repeats same tamper action]
        │
        ▼
[Detection engine fires → WebSocket event → Dashboard]
        │
        ▼
[Claude generates plain-language explanation]
        │
        ▼
[Dashboard shows red alert + explanation + timestamp]
```

### 3.2 Two Operating Modes (Critical for Demo)

| Mode | Behavior |
|---|---|
| **Baseline Mode** | Mimics how most current systems behave — face-value signal trust. Tamper succeeds silently. |
| **Protected Mode** | Detection layer active. Same tamper action triggers real-time flag + explanation. |

The mode toggle itself should be a visible, deliberate UI element — judges should see you flip a switch, not just trust a verbal claim that something changed.

### 3.3 Screens

1. **Landing / Mode Selector** — Admin picks Baseline or Protected, starts session.
2. **Candidate Mock Exam View** — Simple 3–5 question mock exam, just enough to look like a real exam context. This is where the tamper action is performed live.
3. **Admin Live Dashboard** — Real-time signal feed, session status indicator (green/red), alert panel.
4. **Alert Detail View** — Expands a fired alert to show timestamp, signal type (generic label, not exact method), and Claude's plain-language explanation.

---

## 4. AI Instructions

This section defines how Claude is used inside the product (not how Claude should build it — that's for Claude Code separately).

### 4.1 Purpose of the AI Layer

Claude's only job in this product is **translation**: convert a raw, internal detection signal object into a short, clear, non-alarmist explanation for a non-technical exam administrator.

Claude should never be asked to perform the detection logic itself (that's deterministic backend code) and never be asked to generate or suggest new bypass techniques during the live product flow.

### 4.2 System Prompt (For the In-Product Claude Call)

```
You are an integrity-alert assistant for an exam proctoring dashboard.
You receive a structured signal event describing an anomaly detected
during a proctored session. Your job is to explain it in 1-2 sentences
to a non-technical exam administrator.

Rules:
- Never speculate about the candidate's intent (e.g., do not say "the
  candidate was cheating"). Describe only what the signal shows.
- Never explain the underlying bypass mechanism in technical detail.
  Describe the category only (e.g., "a secondary display was detected
  that wasn't present at session start").
- Keep tone neutral and factual, not accusatory.
- Output should be短 — max 2 sentences, no bullet lists, no markdown.
- If signal confidence is below threshold, say so explicitly rather
  than overstating certainty.
```

### 4.3 Example Input/Output

**Input (structured signal event):**
```json
{
  "signal_type": "display_config_anomaly",
  "confidence": 0.94,
  "session_id": "demo-001",
  "detected_at": "2026-06-17T14:32:01Z"
}
```

**Expected Claude Output:**
> "A secondary display was detected partway through this session that wasn't present when the exam started. Confidence in this detection is high (94%)."

### 4.4 What NOT to Build With AI

- Do not let Claude generate the bypass technique itself, even for internal dev convenience — write that deterministically.
- Do not expose a raw prompt/chat interface to Claude anywhere in the candidate-facing UI.
- Do not log full Claude prompts/responses anywhere they'd be visible in a public demo deployment (keep them server-side only).

---

## 5. UI/UX Specification

### 5.1 Visual Direction

Dark, technical, editorial — consistent with existing personal-brand aesthetic (JetBrains Mono for data/labels, clean sans for body text, electric cyan/violet accent pair, no cartoon icons or gradients-for-the-sake-of-gradients).

### 5.2 Color System

| Token | Hex | Usage |
|---|---|---|
| Background | `#0a0a0c` | Base |
| Card | `#131316` | Panels |
| Border | `#232328` | Dividers |
| Cyan (safe/info) | `#00e5ff` | Baseline mode indicator, info states |
| Violet (accent) | `#a855f7` | Secondary accent |
| Red (alert) | `#ff4d6d` | Protected-mode fired alert |
| Green (protected/safe) | `#39ff88` | Protected mode active, no current alert |
| Text primary | `#e8e8ec` | Body |
| Text dim | `#6b6b76` | Secondary labels |

### 5.3 Key Screens — Component Notes

**Mode Selector**
- Large toggle, clearly labeled "Baseline" / "Protected" — not a tiny switch judges might miss.
- Current mode shown persistently in a top bar during the entire demo.

**Admin Dashboard**
- Top: session status pill (green "Monitoring" / red "Alert Fired").
- Center: real-time signal feed, terminal-style log (JetBrains Mono), auto-scrolling.
- Right panel: alert detail card — appears with a slide-in animation when an alert fires, not a jarring popup/modal that blocks the view.
- Avoid any modal/alert() style interruption — keep everything inline so the screen recording / live screen-share stays clean.

**Alert Card**
- Red left-border accent (3px), matches the existing playbook-page pattern already used in this user's other docs.
- Shows: timestamp, signal category label (generic, not method-specific), confidence %, Claude's explanation text.
- No raw technical jargon visible by default — add a small "technical details" expand link for judges who ask, rather than showing it upfront.

### 5.4 Interaction Principles

- Every state change (mode flip, alert fired) should have a visible transition — instant snaps feel like nothing happened; smooth 200–300ms transitions register as "something just changed" to an audience watching from a distance.
- The contrast between Baseline and Protected mode should be the loudest visual element on screen — this is the entire pitch in one comparison.

---

## 6. Backend Schema

### 6.1 Database Tables (PostgreSQL)

```sql
-- Sessions: one row per demo/exam session
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('baseline', 'protected')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'flagged'))
);

-- Signal events: raw signal readings captured during a session
CREATE TABLE signal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    signal_type VARCHAR(50) NOT NULL,
    raw_payload JSONB NOT NULL,
    confidence NUMERIC(4,3),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alerts: fired alerts with the Claude-generated explanation
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    signal_event_id UUID NOT NULL REFERENCES signal_events(id),
    explanation TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (severity IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast dashboard queries
CREATE INDEX idx_signal_events_session ON signal_events(session_id, detected_at);
CREATE INDEX idx_alerts_session ON alerts(session_id, created_at);
```

### 6.2 API Endpoints (FastAPI)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/sessions` | Start a new session, specify mode |
| `PATCH` | `/sessions/{id}` | Update mode mid-session (for live toggle) or end session |
| `POST` | `/sessions/{id}/signals` | Ingest a raw signal event from candidate client |
| `GET` | `/sessions/{id}/alerts` | Fetch all alerts for a session (admin dashboard load) |
| `WS` | `/ws/sessions/{id}` | Real-time stream: signal events + fired alerts pushed to admin dashboard |

### 6.3 WebSocket Event Shape

```json
{
  "event": "alert_fired",
  "session_id": "uuid",
  "signal_type": "display_config_anomaly",
  "confidence": 0.94,
  "explanation": "A secondary display was detected partway through this session that wasn't present when the exam started. Confidence in this detection is high (94%).",
  "timestamp": "2026-06-17T14:32:01Z"
}
```

### 6.4 Claude Integration Point (Backend)

```python
# Pseudocode — backend service layer, not candidate-facing
async def generate_alert_explanation(signal_event: SignalEvent) -> str:
    system_prompt = ALERT_EXPLAINER_SYSTEM_PROMPT  # see Section 4.2
    user_message = json.dumps({
        "signal_type": signal_event.signal_type,
        "confidence": signal_event.confidence,
        "session_id": str(signal_event.session_id),
        "detected_at": signal_event.detected_at.isoformat(),
    })
    response = await claude_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=150,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text
```

---

## 7. 48-Hour Build Plan

### Day 1 (Hours 0–24) — Core Detection Engine

- **0–4:** Lock scope to secondary-display vector only. Set up repo structure (Next.js + FastAPI + Postgres, matching existing project conventions).
- **4–12:** Build baseline mock exam app — simple webcam permission request + 3–5 question mock exam UI + tab-focus tracker that mimics how typical systems behave.
- **12–20:** Implement the tamper technique against this mock system only. Confirm it succeeds silently in Baseline Mode.
- **20–24:** Identify and document (internally) the secondary signal that exposes the tamper. Do not write this in any public-facing file yet.

### Day 2 (Hours 24–44) — Counter-System + Polish

- **24–32:** Build detection layer using the Day 1 signal. Wire up WebSocket push to dashboard. Connect Claude explanation call (Section 4.2/4.4).
- **32–38:** Build dashboard UI per Section 5 — mode toggle, live feed, alert card with slide-in transition.
- **38–42:** Full run-throughs, minimum 5–6 times. Time the full demo sequence (Baseline fail → Protected catch).
- **42–44:** Buffer time for whatever breaks during run-throughs.

### Final 4 Hours — Pitch Prep

- Write pitch following PRD Section 1 — Problem → Solution → Impact metric (e.g., detection latency, or "X% of basic spoof attempts now caught that previously passed silently").
- Prepare the Q&A answer from Section 9 (Risk & Framing Notes) word-for-word — do not improvise this part live.

---

## 8. Demo Script

> Target: under 5 minutes total, ~3.5 min presentation + ~1.5 min live demo, per established pitch principles.

1. **Hook (30 sec):** Open with the problem, not the tech. "Proctoring systems trust their own signals. We found a way to show when that trust is misplaced — and fixed it."
2. **Baseline demo (30–40 sec):** Switch to Baseline Mode. Trigger the tamper live. Show the exam continuing with zero flags. Let the silence land — don't over-explain it.
3. **Protected demo (30–40 sec):** Flip to Protected Mode. Repeat the exact same action. Dashboard fires a red alert within ~2 seconds with Claude's explanation visible on screen.
4. **Impact line (20 sec):** State the one number that matters — detection latency, or confidence %, whatever was actually measured. No buzzwords (no "AI-powered," no "blockchain," no "cutting-edge").
5. **Close (20 sec):** Reiterate scope honestly — "This targets one specific class of tampering, demonstrated only on our own mock system, as a proof of concept for a broader detection approach."

---

## 9. Risk & Framing Notes

### 9.1 Framing Rule (Non-Negotiable for the Pitch)

Never present this as "we bypassed proctoring software." Always present it as "we built a vulnerability-research + auto-detection proof of concept, demonstrated responsibly on our own mock system." This is not just safer — it is also more technically accurate and more impressive to judges who understand security research norms.

### 9.2 Standard Q&A Answer (Memorize, Don't Improvise)

> "We didn't target any real, named proctoring product. We built our own mock system specifically so we could study this class of vulnerability without touching production software anyone depends on. We're also not publishing the exact bypass method — only the detection capability — the same way security researchers handle responsible disclosure."

### 9.3 What to Never Show On Stage

- The exact bypass implementation code, line by line.
- Any claim that a specific named commercial product is vulnerable.
- A public GitHub repo with bypass instructions reusable out of context (keep the repo private until you've reviewed what's safe to make public, post-hackathon).

### 9.4 Post-Hackathon

If continuing this project beyond the hackathon, consider reframing the public repo entirely around the detection/explanation layer, and keep the tamper-trigger code in a separate, access-gated internal module rather than the main public branch.

---

*End of specification. Hand this file to Claude Code as project context — it contains everything needed to scaffold the repo, write the FastAPI routes, the Next.js views, and the Postgres schema without further clarification on product scope.*
