# Morrow implementation plan

## Included in this starter

- Responsive learner dashboard and scenario discovery.
- Original example soft-skills scenarios.
- Interactive text roleplay UI.
- Server-side `/api/roleplay` route with optional OpenAI-compatible chat completion; deterministic fallback is labeled as demo mode.
- Server-side `/api/feedback` route with validated output and explicitly labeled heuristic fallback.
- Local browser persistence for scenarios and session summaries.
- Trainer-oriented scenario studio, sample learner directory and analytics demonstration.
- Text report download.
- Initial Supabase schema and RLS policy sketch.
- REA investigation runbook.

## Not production-ready yet

The frontend's role switch is a presentation/demo control, not authorization. Learner data are local to the browser. Scenarios and session reports are not yet persisted to Supabase. The learner directory uses fictional sample accounts. There is no secure invite system, paid tenancy, live audio, speech-to-text, avatar/3D scene, VR client, validated assessment instrument, audit dashboard, or production data-deletion workflow.

## Milestones

1. **Research** — inspect only authorized public/trial screens; build `feature-matrix.md` with direct evidence versus inference.
2. **Identity** — wire Supabase Auth, organizations and memberships; enforce role checks server-side; test cross-tenant isolation.
3. **Persistence** — save scenario versions, assignments, sessions, turns, feedback reports and audit events in Supabase.
4. **Roleplay quality** — improve scenario-specific system prompts, add timeouts/retries/rate limits, moderation, token limits and prompt-injection tests.
5. **Evaluation quality** — version rubrics, run repeatable tests against a curated synthetic transcript set, show evidence and uncertainty, and evaluate score consistency before trainer use.
6. **Trainer workflows** — publish immutable scenario versions, assign to learners/cohorts, add pathways, reminders and report exports.
7. **Analytics** — aggregate only authorized sessions; define metrics clearly; add consent, retention, deletion and audit rules.
8. **Voice UX** — add opt-in microphone interaction, visible recording state, transcript review and accessibility alternatives.
9. **VR** — define a stable session API, then build a Unity/WebXR client with avatars, spatial audio and controller/hand input. Keep identity, scoring and analytics server-side.
10. **Pilot and hardening** — security review, accessibility checks, load testing, privacy review and documented incident handling.

## Acceptance criteria for the first vertical slice

- Learner opens a published scenario.
- Learner sends a message; server validates input and returns a character response.
- Full transcript is persisted in an authenticated session.
- Learner finishes; evaluator returns schema-validated rubric feedback grounded in transcript evidence.
- Learner can review and retry; original reports stay linked to their scenario version.
- Tests prove learners cannot read or write another user's sessions, or access another organization by changing an identifier.
