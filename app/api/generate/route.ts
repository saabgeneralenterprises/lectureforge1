// app/api/generate/route.ts
// DUAL MODEL APPROACH:
//   Free + Starter  → Gemini Flash  (~₦5/note,   96% cheaper)
//   Basic + Pro + Institution → Claude Sonnet (~₦160/note, best quality)

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const gemini    = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

const PREMIUM_PLANS = ["Basic", "Pro", "Institution"];

const LEVELS: Record<string, { label: string; sub: string }> = {
  primary:   { label: "Primary School",  sub: "Ages 6–11"  },
  middle:    { label: "Middle School",   sub: "Ages 11–14" },
  high:      { label: "High School",     sub: "Ages 14–18" },
  undergrad: { label: "Undergraduate",   sub: "University" },
  postgrad:  { label: "Postgraduate",    sub: "Masters"    },
  phd:       { label: "PhD / Research",  sub: "Doctoral"   },
};

function buildPrompt(form: {
  subject: string; level: string; duration: string;
  format: string; style: string; objectives: string;
}): string {
  const lv = LEVELS[form.level] || LEVELS.undergrad;
  const fmtMap: Record<string, string> = {
    full:    "comprehensive full lecture notes with complete detail",
    outline: "a detailed structured outline with key points and sub-points",
    slides:  "slide-by-slide notes with titles, bullets, and speaker notes",
    flipped: "a flipped classroom guide with pre-reading, in-class activities, and discussion",
  };
  const today = new Date().toLocaleDateString("en-NG", {
    year: "numeric", month: "long", day: "numeric",
  });

  return `You are a world-class educator and curriculum designer. Create ${fmtMap[form.format] || "full lecture notes"} for the following.

SUBJECT: ${form.subject}
ACADEMIC LEVEL: ${lv.label} (${lv.sub})
DURATION: ${form.duration}
TEACHING STYLE: ${form.style || "Engaging, example-driven and interactive"}
${form.objectives ? `LEARNING OBJECTIVES: ${form.objectives}` : ""}

Write COMPLETE, publication-quality lecture notes. Every section FULLY written. Minimum 3,000 words. No truncation, no placeholders.

Use EXACTLY this structure:

# [Compelling Lecture Title]

## 📋 COURSE INFORMATION
| Field | Details |
|-------|---------|
| Subject | ${form.subject} |
| Level | ${lv.label} |
| Duration | ${form.duration} |
| Prepared by | LectureForge AI |
| Date | ${today} |

## 🎯 LEARNING OBJECTIVES
By the end of this lecture, students will be able to:
1. [Bloom's taxonomy objective]
2. [Objective]
3. [Objective]
4. [Objective]
5. [Objective]

## 📖 INTRODUCTION
[3–4 full paragraphs. Compelling hook, real-world relevance, topic preview. Engaging for ${lv.label} students.]

[ILLUSTRATION: an overview diagram showing the key themes and how they connect for the topic of ${form.subject}]

## 📚 MAIN BODY

### Section 1: [First Major Topic]
[4–5 full paragraphs. Theory, concepts, history, real-world applications. Bold **key terms** when first introduced.]

[ILLUSTRATION: a detailed diagram or illustration specific to Section 1 of ${form.subject}, showing the main concept visually]

### Section 2: [Second Major Topic]
[4–5 full paragraphs. Build on Section 1. Examples, case studies, evidence.]

[ILLUSTRATION: a visual aid for Section 2 of ${form.subject}, such as a process flow, comparison, or structural diagram]

### Section 3: [Third Major Topic]
[4–5 full paragraphs. Comparisons, analysis, synthesis at ${lv.label} level.]

[ILLUSTRATION: an illustration for Section 3, for example a graph, map, molecular structure, or conceptual diagram relevant to ${form.subject}]

### Section 4: [Fourth Topic — Advanced or Deep Dive]
[3–4 full paragraphs. Advanced applications, common misconceptions, or real-world case study.]

## 🔑 KEY CONCEPTS & DEFINITIONS
**Term 1**: [precise definition]
**Term 2**: [definition]
**Term 3**: [definition]
**Term 4**: [definition]
**Term 5**: [definition]
**Term 6**: [definition]
**Term 7**: [definition]
**Term 8**: [definition]
**Term 9**: [definition]
**Term 10**: [definition]

## 💡 WORKED EXAMPLES
[2–3 fully worked examples with step-by-step solutions. Realistic and instructive for ${lv.label}.]

[ILLUSTRATION: a step-by-step visual walkthrough of the first worked example for ${form.subject}]

## 💬 DISCUSSION QUESTIONS
1. [Analytical question]
2. [Application to real world]
3. [Critical thinking question]
4. [Comparative question]
5. [Synthesis question]

## 🎯 ACTIVITIES & EXERCISES
**Activity 1: [Name]** — [Full instructions, materials needed, time, expected outcomes]
**Activity 2: [Name]** — [Full instructions]
**Activity 3: [Name]** — [Full instructions]

## 🎓 CONCLUSION
[3–4 full paragraphs. Summarise all key points. Reinforce objectives. Memorable takeaway. Forward-looking statement.]

## ✅ KEY TAKEAWAYS
- [Complete sentence takeaway 1]
- [Takeaway 2]
- [Takeaway 3]
- [Takeaway 4]
- [Takeaway 5]
- [Takeaway 6]
- [Takeaway 7]
- [Takeaway 8]

## 📚 RECOMMENDED RESOURCES
1. [Full citation with annotation]
2. [Resource 2]
3. [Resource 3]
4. [Resource 4]
5. [Resource 5]
6. [Resource 6]

## 📝 ASSESSMENT IDEAS
**Formative:** [2 quick assessment ideas]
**Summative:** [1 major assignment, 1 project idea]
**Quiz Questions:**
1. [Question with answer]
2. [Question with answer]
3. [Question with answer]

CRITICAL FORMATTING RULES — FOLLOW EXACTLY:
- NEVER use LaTeX notation like $x$, $\\frac{}{}$, $10^{-11}$, \\alpha, \\psi etc.
- Write ALL math and symbols in plain Unicode:
  - Superscripts: use ² ³ ⁻¹ ⁻¹¹ ⁺ (e.g. 10⁻¹¹ not $10^{-11}$)
  - Subscripts: use ₁ ₂ ₙ (e.g. m₁ not $m_1$)
  - Greek letters: write α β γ δ ε θ λ μ π σ φ ψ ω Δ Σ directly
  - Fractions: write a/b or use words like "one-half"
  - Operators: use × ÷ ± ≈ ≠ ≤ ≥ → ⇒ ∞ directly
  - Equations: write E = hν not $E = h\\nu$
- For chemical formulas: H₂O, CO₂, Na⁺, Cl⁻ (use subscript/superscript Unicode)
- Every section fully written. Calibrate for ${lv.label} (${lv.sub}). Include [ILLUSTRATION: ...] markers exactly as shown — make descriptions highly specific to ${form.subject}.`;
}

// ── CLAUDE streaming (premium plans) ─────────────────────────────────────────
async function generateWithClaude(form: any, controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    messages: [{ role: "user", content: buildPrompt(form) }],
  });

  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text, model: "claude" })}\n\n`)
      );
    }
  }
}

// ── GEMINI streaming (free/starter plans) ────────────────────────────────────
// -- GEMINI streaming with retry + Claude fallback --
async function generateWithGemini(form: any, controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  const models = ["gemini-3.6-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest"];
  for (let i = 0; i < models.length; i++) {
    try {
      const m = gemini.getGenerativeModel({ model: models[i], generationConfig: { maxOutputTokens: 8192, temperature: 0.7 } });
      controller.enqueue(encoder.encode("data: " + JSON.stringify({ modelInfo: { name: models[i], badge: "AI" } }) + "\n\n"));
      const result = await m.generateContentStream(buildPrompt(form));
      for await (const chunk of result.stream) {
        const t = chunk.text();
        if (t) controller.enqueue(encoder.encode("data: " + JSON.stringify({ text: t }) + "\n\n"));
      }
      return;
    } catch (e: any) {
      const msg = e?.message || "";
      const retry = msg.includes("503") || msg.includes("404") || msg.includes("not found") || msg.includes("no longer");
      if (i < models.length - 1 && retry) { await new Promise(r => setTimeout(r, 1500)); continue; }
      // Fallback to Claude
      controller.enqueue(encoder.encode("data: " + JSON.stringify({ modelInfo: { name: "Claude (fallback)", badge: "AI" } }) + "\n\n"));
      await generateWithClaude(form, controller, encoder);
      return;
    }
  }
}


export async function POST(req: NextRequest) {
  try {
    const { form, userPlan } = await req.json();

    if (!form?.subject?.trim()) {
      return new Response(JSON.stringify({ error: "Subject is required" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const usePremium = PREMIUM_PLANS.includes(userPlan);
    const encoder    = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send which model is being used so frontend can display it
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              modelInfo: usePremium
                ? { name: "Claude Sonnet", badge: "⚡ Premium AI" }
                : { name: "Gemini Flash", badge: "✨ AI Generation" }
            })}\n\n`)
          );

          if (usePremium) {
            await generateWithClaude(form, controller, encoder);
          } else {
            await generateWithGemini(form, controller, encoder);
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: err.message || "Generation failed" })}\n\n`)
          );
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }
}
