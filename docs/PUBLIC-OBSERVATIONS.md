# Public product observations — Bodyswaps

**Scope:** public marketing pages only. This is not a report of a full REA browser capture or an authenticated product audit. The supplied trial URL could not be retrieved by the available text reader, so its exact form state and post-signup journey remain unverified. Use `docs/REA-RUNBOOK.md` to capture those states in an authorized browser session.

**Official sources reviewed on 25 October 2026:**

- `https://bodyswaps.co/` — public homepage content and embedded roleplay-builder demonstration.
- `https://bodyswaps.co/features/bodyswaps-go` — educator/authoring portal overview.
- `https://bodyswaps.co/features/ai-coaching` — public AI coaching and feedback overview.

## Observed public feature categories

| Feature area | Publicly described or visible behaviour | Evidence status | Morrow implementation decision |
|---|---|---|---|
| Roleplay creation | Public demo displays description, character background, conversation topic, character mood, learner role, learner instructions, conversation length, avatar and setting controls. | Observed on public homepage/demo; not independently verified inside trial. | Scenario studio supports objective, persona, mood, learner role/instructions, duration and setting. Avatar/3D presentation is deferred. |
| Scenario authoring | The public product description says educators can choose templates or create roleplays from scratch, with configurable assessment criteria. | Publicly described. | Start with an original form-based scenario studio and versionable rubric schema. |
| Learner practice | Public demo depicts a character speaking and the learner recording a response. | Observed in public demo. | Text-first roleplay works in the web MVP. Voice capture and speech processing remain planned. |
| Skill feedback | Public demo presents categories including paraphrasing/summarising, open questions/clarification, empathy, eye contact, validating emotions and body language. | Observed in public demo. These visible labels do not prove the scoring implementation. | Text MVP evaluates text-observable skills. Eye contact/body language must not be scored from text; those need separate authorized video/VR signals and explicit consent if implemented. |
| Transcript/report | The homepage describes a report for each attempt with the full transcript and immediate feedback. | Publicly described. | Morrow saves a local transcript and feedback report in demo mode. Production persistence is not wired yet. |
| Reflective coaching | Public pages describe an optional AI coach that asks reflection questions and uses the transcript and feedback when relevant. | Publicly described. | MVP includes a reflective coach after feedback, currently using model-backed follow-up if configured and a deterministic fallback otherwise. |
| Pathways and quizzes | Bodyswaps Go describes learning pathways, learning modules, AI roleplays, quizzes/questionnaires and LMS integrations. | Publicly described. | Initial database schema includes pathways and assignments; full trainer authoring, quiz delivery and LMS/LTI integration are future milestones. |
| Analytics | Public pages describe completion, individual/cohort progress, confidence and report exports. | Publicly described. | MVP analytics shows locally saved attempts and aggregate scores only. Confidence metrics and cohort analytics are deferred until a valid measurement definition and secure data model exist. |
| VR / multi-device delivery | Public homepage says practice can be self-paced on desktop, browser, mobile or VR. | Publicly described. | Build web first; later add a separate VR client using stable scenario/session APIs. |
| Trial onboarding | Supplied trial URL's exact fields and redirect flow were not returned by the public text reader. | Unknown. | Inspect with REA in a dedicated browser profile; do not infer from homepage copy. |

## Interpretation limits

- Public marketing copy and an embedded demonstration are evidence of advertised or illustrated behaviour, not proof of availability under every plan or in a particular trial account.
- An observed rubric label is not evidence of the underlying rubric weights, model prompt, reliability, or validity.
- No proprietary assets, private customer data, protected code or hidden service endpoints are included in this implementation.
- Complete the evidence matrix using direct REA captures before making claims about exact behaviour, page transitions or feature parity.
