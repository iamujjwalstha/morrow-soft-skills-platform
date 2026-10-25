import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  scenario: z.object({ title: z.string().max(160), objective: z.string().max(1200), category: z.string().max(120) }),
  turns: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) })).min(2).max(80),
});
const RubricSchema = z.object({
  overall: z.number().min(0).max(100), summary: z.string(), strengths: z.array(z.string()).min(1).max(4), improvements: z.array(z.string()).min(1).max(4), nextStep: z.string(),
  scores: z.array(z.object({ criterion: z.string(), score: z.number().min(1).max(5), rationale: z.string(), evidence: z.string(), suggestion: z.string() })).min(3).max(6),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid feedback request." }, { status: 400 });
  const { scenario, turns } = parsed.data;
  const learnerTurns = turns.filter((t) => t.role === "user");
  if (!learnerTurns.length) return NextResponse.json({ error: "Send at least one learner response before requesting feedback." }, { status: 400 });
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
      const response = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-6-luna",
          reasoning_effort: "none",
          max_completion_tokens: 1200,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `You are a careful formative communication-skills coach. Assess only observable communication behaviours in the transcript against this objective: ${scenario.objective}. This is educational feedback, not a psychological or employment assessment. Be fair and supportive. Scores are 1-5 where 1=not demonstrated, 3=partly demonstrated, 5=clearly demonstrated. Cite brief exact transcript evidence where available; do not invent quotes. If evidence is insufficient, say so and score conservatively. Return valid JSON matching keys: overall (0-100), summary (string), strengths (string array), improvements (string array), nextStep (string), scores (array of objects with criterion, score (1-5), rationale, evidence, suggestion).` },
            { role: "user", content: `Scenario: ${scenario.title}\nCategory: ${scenario.category}\nObjective: ${scenario.objective}\nTranscript:\n${turns.map((t) => `${t.role === "user" ? "Learner" : "Character"}: ${t.content}`).join("\n")}` },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
      const data = await response.json();
      const raw = data?.choices?.[0]?.message?.content;
      if (typeof raw !== "string") throw new Error("Missing feedback output");
      const validated = RubricSchema.safeParse(JSON.parse(raw));
      if (!validated.success) throw new Error("Invalid feedback shape");
      return NextResponse.json({ report: { ...validated.data, mode: "ai" } });
    } catch {
      // Provide a deterministic, clearly labelled demo evaluation when AI review is unavailable.
    }
  }
  return NextResponse.json({ report: demoReport(scenario.objective, learnerTurns.map((x) => x.content)) });
}

function demoReport(objective: string, replies: string[]) {
  const text = replies.join(" ").toLowerCase();
  const hasEmpathy = /(understand|hear you|sounds|frustrat|sorry|apolog|appreciate|concern|difficult|impact)/.test(text);
  const hasAction = /(next step|can do|will|offer|solution|help|update|when|try|agree|follow up|plan)/.test(text);
  const hasQuestion = replies.some((x) => x.includes("?"));
  const longEnough = replies.some((x) => x.trim().split(/\s+/).length >= 10);
  const base = 48 + (hasEmpathy ? 13 : 0) + (hasAction ? 13 : 0) + (hasQuestion ? 10 : 0) + (longEnough ? 8 : 0);
  const scores = [
    { criterion: "Empathy & acknowledgement", score: hasEmpathy ? 4 : 2, rationale: hasEmpathy ? "Your wording includes a signal of acknowledgement or concern." : "The response does not clearly show acknowledgement of the other person's concern." , evidence: hasEmpathy ? "A phrase that signals understanding was detected in your transcript." : "No clear acknowledgement phrase was detected.", suggestion: "Name the other person's concern before moving to a solution." },
    { criterion: "Clarity", score: longEnough ? 4 : 3, rationale: longEnough ? "At least one response provided enough detail to review." : "Responses were brief, so the intent may not be fully clear." , evidence: `${replies.length} learner response(s) were reviewed.`, suggestion: "Use one clear sentence to explain what you understand and one to explain what happens next." },
    { criterion: "Active listening", score: hasQuestion ? 4 : 2, rationale: hasQuestion ? "You asked at least one question, which can help clarify the other person's needs." : "Few or no questions were detected, so the other person's perspective may remain unclear." , evidence: hasQuestion ? "A question mark appeared in a learner response." : "No question was detected in the learner responses.", suggestion: "Ask an open question, then reflect back the answer in your own words." },
    { criterion: "Action orientation", score: hasAction ? 4 : 2, rationale: hasAction ? "The response includes language associated with a next step or practical help." : "A specific next step was not clearly detected." , evidence: hasAction ? "A possible action or follow-up phrase was detected." : "No clear action phrase was detected.", suggestion: "Offer a specific next step and check whether it works for the other person." },
  ];
  const overall = Math.min(100, Math.round(scores.reduce((sum, x) => sum + x.score, 0) / scores.length / 5 * 100));
  return { overall: Math.max(40, Math.min(88, overall)), summary: `Demo heuristic review of ${replies.length} learner response(s). This is not an AI model evaluation. To receive model-generated feedback, configure OPENAI_API_KEY on the server. Objective: ${objective}`, strengths: [hasEmpathy ? "A signal of acknowledgement or empathy appeared in your wording." : "You stayed engaged with the conversation and completed a response.", hasQuestion ? "You used a question to invite further information." : "You have a clear opportunity to make your next response more curious."], improvements: [!hasEmpathy ? "Acknowledge the other person's concern explicitly." : "Reflect back the other person's main concern in your own words.", !hasAction ? "Offer a concrete next step and a time for following up." : "Check that the suggested next step meets the other person's needs."], nextStep: "Repeat this practice and deliberately use: acknowledge → clarify → agree a next step.", scores, mode: "demo" as const };
}
