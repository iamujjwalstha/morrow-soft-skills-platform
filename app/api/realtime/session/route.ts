import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  sdp: z.string().min(10).max(200_000),
  scenario: z.object({
    title: z.string().max(160),
    objective: z.string().max(1200),
    persona: z.string().max(1600),
    openingLine: z.string().max(1600),
    characterMood: z.string().max(80).optional(),
    learnerRole: z.string().max(160).optional(),
    learnerInstructions: z.string().max(1200).optional(),
    setting: z.string().max(160).optional(),
  }),
  turns: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(6000),
  })).max(16).optional(),
});

export async function GET() {
  return NextResponse.json(
    { configured: Boolean(process.env.OPENAI_API_KEY) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Live AI audio is not configured yet. Add OPENAI_API_KEY in the Vercel project environment." },
      { status: 503 },
    );
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid realtime session request." }, { status: 400 });
  }

  const { scenario, sdp, turns = [] } = parsed.data;
  const dialogue = turns.slice(-12).map((turn) => `${turn.role === "user" ? "Learner" : "Character"}: ${turn.content}`).join("\n");
  const hasLearnerSpoken = turns.some((turn) => turn.role === "user");
  const instructions = [
    "You are a simulated conversation partner in a soft-skills practice session. You are an AI playing a character, not a real person.",
    `Scenario: ${scenario.title}`,
    `Setting: ${scenario.setting || "workplace conversation"}`,
    `Character persona: ${scenario.persona}`,
    `Character mood: ${scenario.characterMood || "natural and context-appropriate"}`,
    `Learner role: ${scenario.learnerRole || "participant"}`,
    `Learner objective (do not say this aloud or score the learner during the roleplay): ${scenario.objective}`,
    `Learner guidance: ${scenario.learnerInstructions || "Listen carefully and respond naturally."}`,
    dialogue ? `Recent conversation transcript, oldest first:\n${dialogue}` : "There is no earlier dialogue.",
    hasLearnerSpoken
      ? "Start with one brief in-character bridge that invites the learner to continue from the transcript. Do not repeat the opening line or the prior transcript."
      : `Begin by saying this opening line exactly once: ${scenario.openingLine}`,
    "Respond naturally in 1–3 spoken sentences. Stay in character. Never claim to be a real person. Do not give scores or coaching until the roleplay is finished. Never request sensitive personal information. Leave space for the learner to respond; use natural pauses.",
  ].join("\n");

  try {
    const session = {
      type: "realtime",
      model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1-mini",
      instructions,
      audio: {
        input: {
          transcription: { model: "gpt-4o-mini-transcribe", language: "en" },
          turn_detection: { type: "semantic_vad" },
        },
        output: { voice: "marin" },
      },
    };
    const formData = new FormData();
    formData.set("sdp", sdp);
    formData.set("session", JSON.stringify(session));
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: AbortSignal.timeout(30_000),
    });
    const answerSdp = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: "The Realtime service could not start the session. Check your API key, billing and model access." },
        { status: 502 },
      );
    }
    return new Response(answerSdp, {
      status: 200,
      headers: { "Content-Type": "application/sdp", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Could not connect to the live audio service." }, { status: 502 });
  }
}
