# AI Prompt History & Development Log

## Overview
This log documents the AI tools, prompts, and system design decisions used during the hackathon development of **The Interview Agent**.

---

## Log Entries

### Entry 1: Architecture & System Design
* **Date:** August 7, 2026
* **Tool Used:** Gemini / Claude
* **Purpose:** System architecture definition for dynamic evaluation loop and state tracking.
* **Prompt Summary:** "Design an end-to-end technical architecture for an AI interviewer evaluating enterprise AI topics (RAG, Vector DBs, MCP) with multi-turn context and post-interview feedback."
* **Result:** Defined state schema, evaluator JSON parsing layer, dynamic router, and diagnostic output structure.

### Entry 2: Evaluation Schema & Prompts
* **Date:** August 7, 2026
* **Tool Used:** Gemini / Claude
* **Purpose:** Build strict structured evaluation prompt for candidate answer scoring.
* **Prompt Summary:** "Create a TypeScript interface and system prompt to evaluate candidate answers on technical accuracy, missing concepts, depth score, and next conversation action."
* **Result:** Formatted JSON schema for evaluation parsing and dynamic persona prompt builders.

### Entry 3: UI Dashboard & Scorecard Component
* **Date:** August 7, 2026
* **Tool Used:** Gemini / Claude
* **Purpose:** Build the interview dashboard interface with live scorecard updates.
* **Prompt Summary:** "Build a responsive interview UI with domain selection, a live updating scorecard sidebar across Correctness, Clarity, Depth, and Communication, and animated chat message bubbles using Tailwind CSS and Framer Motion."
* **Result:** Created smooth UI components, modal reporting views, and domain selector cards.

### Entry 4: Continuous Score Blending & Running Average
* **Date:** August 8, 2026
* **Tool Used:** Gemini / Claude
* **Purpose:** Fix score calculation so subsequent answers accurately drive the total score up or down.
* **Prompt Summary:** "Update the client-side score update formula from a static exponential moving average to a progressive running average calculation so every question turn properly recalculates cumulative mastery scores."
* **Result:** Corrected score aggregation logic in `page.tsx` for real-time dynamic scoring updates.

### Entry 5: Negative & Short Answer Handling
* **Date:** August 8, 2026
* **Tool Used:** Gemini / Claude
* **Purpose:** Ensure incorrect or negative responses (such as typing 'no') immediately lower the candidate's score.
* **Prompt Summary:** "Update the API route evaluation prompt and fallback mechanism to strictly penalize brief refusals, incorrect statements, or negative answers like 'no' with low scores (0-20 range)."
* **Result:** Configured strict grading boundaries in `route.ts` to handle short/negative user inputs.

### Entry 6: Final Polish & Vercel Deployment
* **Date:** August 8, 2026
* **Tool Used:** Gemini / Claude
* **Purpose:** Resolve deployment issues and verify hackathon submission requirements.
* **Prompt Summary:** "Troubleshoot Vercel deployment constraints, verify environment variables for the Gemini API route, and check all submission parameters."
* **Result:** Successfully built, deployed, and verified live application readiness.