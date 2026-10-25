# Morrow — AI Soft Skills Studio

An independent AI soft-skills training platform prototype, inspired by common soft-skills training workflows. This is not a copy of Bodyswaps' proprietary source code or content.

## Source bootstrap

The project source is provided as a compressed archive while GitHub Actions expands it into ordinary browsable files. The workflow `.github/workflows/expand-source.yml` runs when added to `main` or when manually invoked.

After the workflow succeeds, this repository root will contain the Next.js source tree, database migration, API routes, and project docs.

## Run locally

Use Node.js 22 or 24 and npm.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000.

Demo mode is available without provider credentials. To enable model-backed roleplay/feedback, set `OPENAI_API_KEY` in `.env.local` and restart the server. Never commit real API keys.

## Current scope

- Learner dashboard, scenario library and text roleplay
- Trainer and analytics prototype screens
- Server-side AI routes with demo fallbacks
- Initial Supabase schema
- REA investigation runbook and implementation roadmap

## Limitations

This is a starter MVP, not a production system. Persistent Supabase authentication/storage still needs to be wired to the interface, and a full dependency install/build/functional test is still required. Voice interaction and VR are later phases.

## Deployment

This repository is intended to deploy as a Next.js project on Vercel after the expansion workflow succeeds. Configure secrets such as `OPENAI_API_KEY` in the host's environment-variable settings, not in this repository.
