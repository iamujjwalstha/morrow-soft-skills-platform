import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  scenario: z.object({ title: z.string().max(160), objective: z.string().max(1200) }),
  report: z.object({ summary: z.string().max(3000), strengths: z.array(z.string().max(500)).max(8), improvements: z.array(z.string().max(500)).max(8), nextStep: z.string().max(1200) }),
  turns: z.array(z.object({ role: z.enum(["learner", "coach"]), content: z.string().max(3000) })).max(24),
  message: z.string().trim().min(1).max(1200),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid reflection message." }, { status: 400 });
  const { scenario, report, turns, message } = parsed.data;
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
          max_completion_tokens: 500,
          messages: [
            { role: "system", content: `You are a supportive reflective learning coach, not the roleplay character. Help a learner reflect on the practice scenario "${scenario.title}" and objective "${scenario.objective}". The prior feedback summary is: ${report.summary}. Observed strengths: ${report.strengths.join("; ")}. Practice opportunities: ${report.improvements.join("; ")}. Suggested next step: ${report.nextStep}. Ask at most one focused reflective question at a time. Help the learner form their own next step instead of lecturing or re-scoring them. Do not infer personality, mental health, or job suitability. Keep replies to 2-4 sentences and avoid asking for sensitive personal information.` },
            ...turns.slice(-12).map((t) => ({ role: t.role === "coach" ? "assistant" : "user", content: t.content })),
          ],
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (typeof reply !== "string" || !reply.trim()) throw new Error("Empty coach reply");
      return NextResponse.json({ reply: reply.trim(), mode: "ai" });
    } catch {
      // Keep the reflection flow usable with a clearly bounded demo response.
    }
  }
  return NextResponse.json({ reply: demoCoachReply(message, report), mode: "demo" });
}

function demoCoachReply(message: string, report: { strengths: string[]; improvements: string[]; nextStep: string }) {
  const lower = message.toLowerCase();
  if (/(challenge|difficult|hard|nervous|unsure)/.test(lower)) return `It makes sense that this part felt challenging. ${report.improvements[0] || "Try slowing the moment down and identifying the other person's main concern."} What is one phrase you could use to begin that response next time?`;
  if (/(different|next time|change|improve|try)/.test(lower)) return `A useful next experiment could be: ${report.nextStep} Keep it small enough to remember in the moment. Which part of that feels most natural for you to try?`;
  if (/(proud|well|good|strength)/.test(lower)) return `It is worth noticing what worked. ${report.strengths[0] || "You stayed engaged with the conversation."} What do you think helped you respond that way, and how could you repeat it in another situation?`;
  return `Thanks for reflecting on that. A good next step is to connect your intention to something observable: ${report.nextStep} What would the other person hear or notice if you put that into practice?`;
}
