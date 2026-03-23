# Project Context

## What This Project Does
PawSOS is a voice-first pet emergency assistant. Pet owners speak to the agent, describe their pet's problem, and get an immediate triage assessment (EMERGENCY/URGENT/MONITOR) from trusted vet sources, first-aid guidance, and emergency vet locator. Built for ElevenHacks #1 hackathon.

## Key Technologies
- **Runtime:** Node.js 18+
- **Backend:** Express.js
- **Voice AI:** ElevenLabs ElevenAgents (SDK: @11labs/client)
- **Search:** Firecrawl Search API (firecrawl-js)
- **Frontend:** Vanilla HTML/CSS/JS (single file, no build step)
- **Deploy:** Railway (backend) + Vercel (frontend)

## Architecture Overview
1. User speaks to ElevenAgents voice agent
2. Agent calls backend webhooks (symptom_search, vet_finder)
3. Backend runs parallel Firecrawl searches across ASPCA, PetMD, Blue Cross UK
4. Backend classifies severity and extracts first-aid steps
5. Agent speaks results back to user
6. Frontend shows severity badge, transcript, vet cards

## Key Decisions
- Single-file frontend (no build step) — hackathon speed
- Keyword-based severity classification (no LLM needed for triage)
- 3 parallel Firecrawl searches per symptom query — balance speed vs coverage
- Mobile-first design (420px max-width) — demo video is phone-recorded

## External Dependencies
- ElevenLabs ElevenAgents API (voice + conversation)
- Firecrawl Search API (real-time web search)
- Google Fonts (DM Serif Display, DM Sans, JetBrains Mono)

## Environment
- Backend: `FIRECRAWL_API_KEY`, `ELEVENLABS_API_KEY`, `PORT`
- Frontend: `agentId` hardcoded or via URL param
- Deploy: Railway (backend), Vercel (frontend)
