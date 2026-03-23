# PawSOS — Pet Emergency Voice Agent

## What This Is
A voice-first emergency assistant for pet owners. Combines ElevenLabs ElevenAgents (voice AI) with Firecrawl Search API (real-time vet data) to triage pet emergencies, give first-aid guidance, and locate nearby emergency vets. Built for ElevenHacks #1 (deadline: 26 March 2026, 17:00 GMT).

## Commands
```
cd backend && npm install   # Install backend deps
cd backend && npm start     # Start backend (port 3000)
cd backend && npm run dev   # Start with nodemon
```

## Architecture
- **Backend:** Node.js + Express, two webhook endpoints for ElevenAgents
- **Frontend:** Single HTML file (vanilla HTML/CSS/JS), served separately
- **Voice:** ElevenLabs ElevenAgents SDK (@11labs/client) loaded via CDN
- **Search:** Firecrawl Search API for real-time vet data from ASPCA, PetMD, Blue Cross UK
- **Deploy:** Railway (backend) + Vercel (frontend)

## Conventions
- Backend: CommonJS (require), Express patterns
- Frontend: Single file, no build step, vanilla JS
- API responses: `{ severity, first_aid, go_to_vet, sources }` or `{ vets: [...] }`
- All endpoints wrapped in try/catch with structured error JSON

## Watch Out For
- ElevenAgents webhook timeout is ~8 seconds — backend must respond fast
- Firecrawl rate limits — cache common queries if needed
- Frontend must work on mobile (demo video is phone-first)
- CORS must allow all origins for hackathon demo

## Rules

Detailed rules live in `.claude/rules/` and load automatically:
- **`accuracy.md`** — Data verification and honesty rules
- **`code-standards.md`** — Code quality and testing standards
- **`project-rules.md`** — Project-specific workflow rules

## Slash Commands

| Command | What it does |
|---|---|
| `/prime` | Initialize session — load project context and confirm readiness |
| `/create-plan [request]` | Create a detailed plan before multi-step work |
| `/implement [plan-path]` | Execute a plan step-by-step |

## Self-Learning

**When the user corrects you or gives feedback — IMMEDIATELY save it to `memory/feedback.md`.**

## Self-Tooling

**When you need a tool — build it.** Scripts in `scripts/`, one-offs in `/tmp/`.

## System Maintenance
- Self-maintain CLAUDE.md and rules/. After structural changes, update the relevant file.
- Self-maintain memory/feedback.md. Remove obsolete entries.
