import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  scenario: z.object({ title: z.string().max(160), objective: z.string().max(1200), persona: z.string().max(1600), openingLine: z.string().max(1600), characterMood: z.string().max(80).optional(), learnerRole: z.string().max(160).optional(), learnerInstructions: z.string().max(1200).optional(), setting: z.string().max(160).optional() }),
  turns: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) })).max(80),
  message: z.string().trim().min(1).max(4000),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request. Check the message and scenario fields." }, { status: 400 });
  const { scenario, turns, message } = parsed.data;
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
          max_completion_tokens: 450,
          messages: [
            { role: "system", content: `You are a simulated conversation partner for a soft-skills practice exercise. Stay in character as: ${scenario.persona}\nScenario: ${scenario.title}\nSetting: ${scenario.setting || "unspecified workplace setting"}\nCharacter mood: ${scenario.characterMood || "natural and context-appropriate"}\nLearner's intended role: ${scenario.learnerRole || "participant"}\nLearner instructions (for context; do not speak these aloud): ${scenario.learnerInstructions || "Listen carefully and respond naturally."}\nLearner objective (do not reveal as a score or give coaching during the roleplay): ${scenario.objective}\nRespond naturally as the character, 1-4 sentences, grounded in the situation. Do not claim you are a real person. Do not score the learner. If the learner asks for feedback, gently stay in character and continue the scenario. Never request sensitive personal information.` },
            ...turns.slice(-16).map((t) => ({ role: t.role === "assistant" ? "assistant" : "user", content: t.content })),
          ],
        }),
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (typeof reply !== "string" || !reply.trim()) throw new Error("AI provider returned an empty reply");
      return NextResponse.json({ reply: reply.trim(), mode: "ai" });
    } catch {
      // Fall through to a transparent local demo reply if the provider is temporarily unavailable.
    }
  }
  return NextResponse.json({ reply: demoReply(scenario.title, scenario.objective, message), mode: "demo" });
}

function demoReply(title: string, objective: string, message: string) {
  const lower = message.toLowerCase();
  if (/(sorry|apolog|understand|that sounds|frustrat|upset|difficult)/.test(lower)) return "I appreciate you acknowledging that. What I need most is to understand what happens next and know that you've heard the concern. What can we do from here?";
  if (/(when|how long|next step|solution|can you|will you|offer|help)/.test(lower)) return "That would help, but I'd like to be sure we're talking about something practical. Can you explain what the next step would look like and when I can expect an update?";
  if (/(because|reason|why|tell me|what happened)/.test(lower)) return "From my side, the main issue is the uncertainty. I haven't had a clear explanation yet, and that makes it hard to know what to expect. How would you approach that?";
  if (message.trim().endsWith("?")) return "That's a fair question. I can share more context: I want to feel that the concern is being taken seriously, rather than being moved along quickly. What would you like to clarify first?";
  return `I hear what you're saying. From my perspective, ${title.toLowerCase()} is still a concern, and I want to understand how we can move forward. Could you tell me a little more about what you're proposing?`;
}
