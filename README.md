# Morrow — AI Soft Skills Studio

An original soft-skills training platform starter inspired by common AI roleplay and experiential-learning patterns. It is **not a copy of Bodyswaps** and includes only original demo scenarios and UI code.

## What works in this starter

- Learner dashboard and scenario browsing
- Text-based roleplay UI
- Optional server-side OpenAI-compatible responses
- Feedback report with rubric dimensions and a reflective AI-coach follow-up
- Trainer-oriented scenario studio (create and delete scenarios locally)
- Sample learner directory and analytics views
- Local browser persistence and text report export
- Supabase schema/RLS starting point
- REA workflow documentation for a scoped, authorized investigation

### Honest demo-mode behaviour

Without `OPENAI_API_KEY`, roleplay responses, feedback and reflection coaching use deterministic rules and are marked **demo**. This is a functional prototype, not a real AI service or validated skills assessment. The current UI does not connect to Supabase; saved data remain in the browser's localStorage. Do not enter sensitive or real learner information.

## Run locally

Prerequisite: Node.js 22+ recommended for this Next.js app. REA itself has a stricter currently documented minimum of Node.js 22.23.4 (or supported 24.x / 26.x releases); check `docs/REA-RUNBOOK.md`.

```powershell
# From the project directory
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

To enable model-backed roleplay and evaluation, edit `.env.local` on your own machine:

```dotenv
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-6-luna
OPENAI_BASE_URL=https://api.openai.com/v1
```

Restart the development server after changing env vars. Never put the API key in `NEXT_PUBLIC_*`, browser code, screenshots or Git. AI-provider errors currently fall back to demo mode; inspect server logs and improve failure reporting before production.

## Supabase foundation

`supabase/migrations/001_initial_schema.sql` defines organizations, memberships, scenario versions, pathways, assignments, sessions, turns, feedback reports, rubric scores and audit events with initial RLS policies. It is an implementation starting point, not a security certification. Review and test all policies before use with real data. The current user interface does not yet call Supabase or perform server-side user authorization.

## Use REA for research

See [`docs/REA-RUNBOOK.md`](docs/REA-RUNBOOK.md) for installing REA, isolating the Chrome profile, discovering a page, creating sanitized evidence captures and comparing the new app. Official docs: [REA repository](https://github.com/morluto/rea), [installation guide](https://github.com/morluto/rea/blob/main/docs/installation.md), [browser observation guide](https://github.com/morluto/rea/blob/main/docs/browser-observation.md).

Only investigate public pages and trial functionality you are authorized to access. REA is a passive inspection and analysis tool; it is not a way to bypass authentication or recover proprietary backend logic.

## Project docs

- [`docs/PUBLIC-OBSERVATIONS.md`](docs/PUBLIC-OBSERVATIONS.md) — publicly visible reference features and evidence limits
- [`docs/IMPLEMENTATION-PLAN.md`](docs/IMPLEMENTATION-PLAN.md) — scope, milestones and acceptance criteria
- [`docs/REA-RUNBOOK.md`](docs/REA-RUNBOOK.md) — practical investigation steps
- [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql) — initial database model and RLS sketch

## Hands-free voice practice (beta)

The Practice lab includes an opt-in **Live voice** mode. In supported browsers (best tested in Chrome or Edge), the scenario prompt is spoken aloud, microphone speech is transcribed by the browser, the transcript is sent through the same `/api/roleplay` flow as typed messages, and the reply is read aloud before listening resumes. Stop the voice session at any time; text entry remains available as a fallback.

Browser speech recognition and speech synthesis are used for this first version; it is turn-based rather than a streaming, interruption-capable speech-to-speech connection. Real AI conversation replies still require `OPENAI_API_KEY` in the server environment. Without it, the app uses the clearly limited demo roleplay reply generator.

## Next milestones

1. Inspect the authorized Bodyswaps trial with REA and fill in an evidence-backed feature matrix.
2. Wire Supabase authentication and persistence; replace demo sample learner data.
3. Add authenticated scenario/assignment/report routes and automated RLS tests.
4. Test the AI evaluator on synthetic scenarios and disclose score limitations.
5. Evaluate voice mode across supported browsers, then consider a streaming speech-to-speech connection and a separate VR client.
