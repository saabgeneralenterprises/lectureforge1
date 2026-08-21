// app/api/diagram/route.ts
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

const LAYOUTS: Record<string, string> = {
  concept:   "1 central node at (410,200), 6 satellites in a circle, each satellite has 2 child nodes",
  timeline:  "horizontal line at y=200, 7 events alternating above y=130 and below y=270",
  cycle:     "5 steps in clockwise circle, radius 145, center (410,210), arrows between each step",
  hierarchy: "root at (410,70), 3 branch nodes at y=185, 2-3 leaf nodes each at y=310",
  flow:      "6 nodes left-to-right at y=210, include 1 diamond decision node, connect all with arrows",
  mindmap:   "central node at (410,200), 5 main branches radiating outward, 2-3 sub-nodes each",
  venn:      "left circle center (290,200) r=130, right circle center (530,200) r=130, overlapping region labeled",
  compare:   "two columns: headers at (220,80) and (600,80), 5 comparison rows at y=140 to y=320",
};

function buildPrompt(subject: string, level: string, dtype: string): string {
  const lv = LEVEL_LABELS[level] || "Undergraduate";
  return `Create an educational SVG diagram for "${subject}" at ${lv} level. Type: ${dtype}.
Layout: ${LAYOUTS[dtype] || LAYOUTS.concept}

Return ONLY valid JSON, no markdown:
{"type":"${dtype}","title":"max 6 word title","desc":"one educational sentence","nodes":[{"id":"n1","label":"Specific Label","sublabel":"optional","x":410,"y":200,"w":120,"h":50,"shape":"rect","color":"#2563EB","textColor":"#fff","fontSize":12}],"edges":[{"from":"n1","to":"n2","label":"optional","style":"solid","color":"#D8D2C8"}],"annotations":[{"text":"note","x":100,"y":50,"color":"#8A8F9A","fontSize":10}]}

Rules: canvas 820x440. x:60–760, y:40–400. Use 15-20 nodes. Colors: #1E3A5F #C8401A #D4A847 #2D7A4F #7C3AED #2563EB #D97706 #0891B2. All labels specific to "${subject}". Connect all nodes logically with edges.`;
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
  const models = ["gemini-3.6-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest"];
  for (let i = 0; i < models.length; i++) {
    try {
      const model = gemini.getGenerativeModel({ model: models[i] });
      const res = await model.generateContent(prompt);
      return res.response.text();
    } catch (e: any) {
      const msg = e?.message || "";
      const retry = msg.includes("503") || msg.includes("404") || msg.includes("not found") || msg.includes("no longer");
      if (i < models.length - 1 && retry) { await new Promise(r => setTimeout(r, 1500)); continue; }
      // Fallback to Claude on all Gemini failures
      return await callClaude(prompt);
    }
  }
  return await callClaude(prompt);
}

export async function POST(req: NextRequest) {
  try {
    const { subject, level, dtype, userPlan } = await req.json();
    const usePremium = PREMIUM_PLANS.includes(userPlan);
    const prompt = buildPrompt(subject, level, dtype);

    const raw = usePremium
      ? await callClaude(prompt)
      : await callGemini(prompt);

    const clean = raw.replace(/```json\n?|```/g, "").trim();
    return NextResponse.json(JSON.parse(clean));
  } catch (err: any) {
    return NextResponse.json({ error: "Diagram failed: " + err.message }, { status: 500 });
  }
}
