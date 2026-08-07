\# AI Prompt History \& Development Log



\## Overview

This log documents the AI tools, prompts, and system design decisions used during the hackathon development of \*\*The Interview Agent\*\*.



\---



\## Log Entries



\### Entry 1: Architecture \& System Design

\* \*\*Date:\*\* August 7, 2026

\* \*\*Tool Used:\*\* Gemini / Claude

\* \*\*Purpose:\*\* System architecture definition for dynamic evaluation loop and state tracking.

\* \*\*Prompt Summary:\*\* "Design an end-to-end technical architecture for an AI interviewer evaluating enterprise AI topics (RAG, Vector DBs, MCP) with multi-turn context and post-interview feedback."

\* \*\*Result:\*\* Defined state schema, evaluator JSON parsing layer, dynamic router, and diagnostic output structure.



\### Entry 2: Evaluation Schema \& Prompts

\* \*\*Date:\*\* August 7, 2026

\* \*\*Tool Used:\*\* Gemini / Claude

\* \*\*Purpose:\*\* Build strict structured evaluation prompt for candidate answer scoring.

\* \*\*Prompt Summary:\*\* "Create a TypeScript interface and system prompt to evaluate candidate answers on technical accuracy, missing concepts, depth score, and next conversation action."

\* \*\*Result:\*\* Formatted JSON schema for `lib/evaluator.ts` and dynamic persona prompt builders.

