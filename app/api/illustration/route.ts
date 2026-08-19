// app/api/illustration/route.ts
// DUAL MODEL: Free/Starter → Gemini Flash | Basic/Pro/Institution → Claude

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const gemini    = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const PREMIUM_PLANS = ["Basic", "Pro", "Institution"];

const LEVEL_LABELS: Record<string, string> = {
  primary: "Primary School", middle: "Middle School", high: "High School",
  undergrad: "Undergraduate", postgrad: "Postgraduate", phd: "PhD / Research",
};

function buildPrompt(description: string, subject: string, level: string): string {
  const lv = LEVEL_LABELS[level] || "Undergraduate";
  return `Create a detailed educational SVG illustration for: "${description}"
Subject: ${subject} | Level: ${lv}

Return ONLY valid JSON (no markdown):
{"title":"illustration title","caption":"one educational sentence","svgElements":[
{"type":"rect","x":100,"y":80,"w":160,"h":90,"rx":8,"fill":"#2563EB","stroke":"#1a4a9a","strokeWidth":2},
{"type":"circle","cx":400,"cy":180,"r":55,"fill":"#D4A847","stroke":"#B45309","strokeWidth":2},
{"type":"ellipse","cx":600,"cy":200,"rx":90,"ry":50,"fill":"#2D7A4F22","stroke":"#2D7A4F","strokeWidth":2},
{"type":"line","x1":200,"y1":100,"x2":400,"y2":260,"stroke":"#C8401A","strokeWidth":2,"strokeDasharray":"6,3"},
{"type":"path","d":"M 100 250 Q 300 80 500 250","fill":"none","stroke":"#7C3AED","strokeWidth":2.5},
{"type":"polygon","points":"300,60 350,150 250,150","fill":"#C8401A","stroke":"#fff","strokeWidth":1.5},
{"type":"arrow","x1":300,"y1":80,"x2":300,"y2":220,"stroke":"#0D0D0D","strokeWidth":2,"color":"#0D0D0D"},
{"type":"text","x":300,"y":155,"text":"Label","fontSize":13,"fontWeight":"700","fill":"#fff","textAnchor":"middle"},
{"type":"label","x":600,"y":100,"text":"Component","fontSize":11,"fill":"#3D4A5C","textAnchor":"middle"},
{"type":"bracket","x":50,"y1":80,"y2":260,"text":"System","color":"#C8401A"}
],"background":"#F7F4EF","width":820,"height":360}

RULES:
- Canvas 820x360. Create 18-28 elements for a rich textbook-quality illustration.
- ALL content specific to "${description}" — no generic shapes.
- Label every major component with text elements.
- Colors: #1E3A5F #C8401A #D4A847 #2D7A4F #7C3AED #2563EB #D97706 #0891B2 #059669
- Add arrows for flow/direction. Brackets for grouping.
- Background: #F7F4EF or #EEF4FF or #F0FBF4 or #FFFBF0
- Biology: cells, organelles, membranes with labels.
- Chemistry: molecular bonds, reaction arrows, electron shells.
- Physics: force vectors, wave diagrams, circuit elements.
- History/Geography: simplified maps, timelines, regional outlines.
- Mathematics: coordinate axes, curves, geometric proofs.
- Economics: supply/demand curves, flow diagrams, bar charts.
- Accurate and educational for ${lv}.`;
}

async function callClaude(prompt: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });
  return (res.content as any[]).map(b => b.text || "").join("");
}

async function callGemini(prompt: string): Promise<string> {
  const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
  const res = await model.generateContent(prompt);
  return res.response.text();
}

export async function POST(req: NextRequest) {
  try {
    const { description, subject, level, userPlan } = await req.json();
    const usePremium = PREMIUM_PLANS.includes(userPlan);
    const prompt = buildPrompt(description, subject, level);

    const raw = usePremium
      ? await callClaude(prompt)
      : await callGemini(prompt);

    const clean = raw.replace(/```json\n?|```/g, "").trim();
    return NextResponse.json(JSON.parse(clean));
  } catch (err: any) {
    return NextResponse.json({ error: "Illustration failed: " + err.message }, { status: 500 });
  }
}
