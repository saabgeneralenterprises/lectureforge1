import { useState, useEffect } from "react";

// ─── Color constants ─────────────────────────────────────────────────────────
const C = {
  ink: "#0D0D0D", paper: "#F7F4EF", cream: "#EDE8DF",
  accent: "#C8401A", gold: "#D4A847", slate: "#3D4A5C",
  muted: "#8A8F9A", success: "#2D7A4F", border: "#D8D2C8",
  card: "#FDFBF8", purple: "#7C3AED", blue: "#2563EB",
};


// ─── Constants ────────────────────────────────────────────────────────────────
const LEVELS = [
  { id: "primary",   label: "Primary",       sub: "Ages 6–11",     icon: "🌱" },
  { id: "middle",    label: "Middle School",  sub: "Ages 11–14",    icon: "📗" },
  { id: "high",      label: "High School",    sub: "Ages 14–18",    icon: "📘" },
  { id: "undergrad", label: "Undergraduate",  sub: "University",    icon: "🎓" },
  { id: "postgrad",  label: "Postgraduate",   sub: "Masters",       icon: "📚" },
  { id: "phd",       label: "PhD / Research", sub: "Doctoral",      icon: "🔬" },
];

const FORMATS = [
  { id: "full",    label: "Full Notes",         desc: "Complete lecture notes" },
  { id: "outline", label: "Outline",            desc: "Structured key points"  },
  { id: "slides",  label: "Slide Notes",        desc: "Slide-by-slide guide"   },
  { id: "flipped", label: "Flipped Classroom",  desc: "Pre-class + activities" },
];

const DURATIONS = ["30 min", "45 min", "1 hour", "1.5 hours", "2 hours", "3 hours"];
const PLAN_LIMITS = { Free: 1, Starter: 15, Basic: 40, Pro: 100, Institution: 300 };

// ─── Plan pricing (for display) ──────────────────────────────────────────────
const PLAN_PRICES = {
  Free:        { naira: "₦0",      per: "/forever",  apiCost: "~₦480",  profit: "Free trial" },
  Starter:     { naira: "₦3,500",  per: "/month",    apiCost: "~₦2,400",profit: "+₦1,100/mo" },
  Basic:       { naira: "₦8,000",  per: "/month",    apiCost: "~₦6,400",profit: "+₦1,600/mo" },
  Pro:         { naira: "₦18,000", per: "/month",    apiCost: "~₦16,000",profit: "+₦2,000/mo" },
  Institution: { naira: "₦45,000", per: "/month",    apiCost: "~₦48,000",profit: "Custom" },
};

// ─── API Call ─────────────────────────────────────────────────────────────────
// ─── Route to right AI based on plan ────────────────────────────────────────
const PREMIUM_PLANS = ["Basic", "Pro", "Institution"];

async function callClaude(prompt, maxTokens) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens || 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return (data.content || []).map((b) => b.text || "").join("");
}

async function callGemini(prompt, maxTokens) {
  // Gemini via OpenAI-compatible endpoint (Google AI Studio)
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + (window._GOOGLE_API_KEY || ""),
    },
    body: JSON.stringify({
      model: "gemini-2.0-flash",
      max_tokens: maxTokens || 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// Route to Gemini for Free/Starter, Claude for Basic/Pro/Institution
async function callAI(prompt, maxTokens, userPlan) {
  if (PREMIUM_PLANS.includes(userPlan)) {
    return callClaude(prompt, maxTokens);
  }
  return callGemini(prompt, maxTokens);
}

// ─── Prompts ──────────────────────────────────────────────────────────────────
function buildNotesPrompt(form) {
  const lv = LEVELS.find((l) => l.id === form.level);
  const fmtMap = {
    full: "comprehensive full lecture notes with all details",
    outline: "a detailed structured outline with key points and sub-points",
    slides: "slide-by-slide notes with slide titles, bullet points, and speaker notes",
    flipped: "a flipped classroom guide with pre-reading, in-class activities, and discussion",
  };
  return `You are a world-class educator and curriculum designer. Create ${fmtMap[form.format] || "full lecture notes"} for the following.

SUBJECT: ${form.subject}
ACADEMIC LEVEL: ${lv.label} (${lv.sub})
DURATION: ${form.duration}
TEACHING STYLE: ${form.style || "Engaging, example-driven, and interactive"}
${form.objectives ? `LEARNING OBJECTIVES: ${form.objectives}` : ""}

Write COMPLETE, publication-quality lecture notes. Every section must be FULLY written — no placeholders, no "add content here", no truncation. Use rich academic language appropriate for ${lv.label} level.

Use EXACTLY this structure with these exact markdown headings:

# [Compelling Lecture Title]

## 📋 COURSE INFORMATION
| Field | Details |
|-------|---------|
| Subject | ${form.subject} |
| Level | ${lv.label} |
| Duration | ${form.duration} |
| Format | ${form.format} |
| Prepared by | LectureForge AI |
| Date | ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} |

## 🎯 LEARNING OBJECTIVES
By the end of this lecture, students will be able to:
1. [Objective using Bloom's verb]
2. [Objective]
3. [Objective]
4. [Objective]
5. [Objective]

## 📖 INTRODUCTION
[Write 3–4 full paragraphs. Open with a compelling hook or real-world scenario. Explain why this topic matters. Connect to students' existing knowledge. Preview what the lecture will cover. Make it engaging and thought-provoking for ${lv.label} students.]

## 📚 MAIN BODY

### Section 1: [First Major Topic Name]
[Write at least 4–5 full paragraphs covering the theory, concepts, historical context if relevant, and real-world applications. Include specific examples. Use **bold** for key terms when first introduced. Be thorough and detailed.]

### Section 2: [Second Major Topic Name]
[Write at least 4–5 full paragraphs. Build on Section 1. Introduce more complexity or a different angle. Include examples, case studies, or evidence. Maintain ${lv.label} appropriate language.]

### Section 3: [Third Major Topic Name]
[Write at least 4–5 full paragraphs. Continue developing understanding. Include comparisons, analysis, or synthesis depending on the level. Examples must be concrete and relevant.]

### Section 4: [Fourth Major Topic or Deep Dive]
[Write at least 3–4 full paragraphs. Could be a deeper exploration, common misconceptions addressed, or advanced applications. Ensure completeness.]

## 🔑 KEY CONCEPTS & DEFINITIONS
Provide definitions for 8–12 important terms:

**Term 1**: [Clear, precise definition appropriate for ${lv.label}]
**Term 2**: [Definition]
[Continue for all terms...]

## 💡 WORKED EXAMPLES
[Provide 2–3 fully worked examples, problems, or case studies with step-by-step solutions or analysis. Make them realistic and instructive.]

## 💬 DISCUSSION QUESTIONS
1. [Thought-provoking question requiring analysis]
2. [Question connecting theory to practice]
3. [Question encouraging critical thinking]
4. [Question for group discussion]
5. [Question connecting to real world]

## 🎯 ACTIVITIES & EXERCISES
**Activity 1: [Name]**
[Full description with instructions, materials needed, time estimate, and expected outcomes]

**Activity 2: [Name]**
[Full description with instructions]

**Activity 3: [Name]**
[Full description with instructions]

## 🎓 CONCLUSION
[Write 3–4 full paragraphs. Summarise all key points covered. Reinforce the main learning objectives. Connect back to the opening hook. Give students a memorable takeaway. End with a forward-looking statement that builds anticipation for the next topic.]

## ✅ SUMMARY — KEY TAKEAWAYS
- [Essential point 1 — written as a complete sentence]
- [Essential point 2]
- [Essential point 3]
- [Essential point 4]
- [Essential point 5]
- [Essential point 6]
- [Essential point 7]
- [Essential point 8]

## 📚 RECOMMENDED RESOURCES
1. [Book/Article/Website with full citation and brief annotation]
2. [Resource 2]
3. [Resource 3]
4. [Resource 4]
5. [Resource 5]
6. [Resource 6]

## 📝 ASSESSMENT IDEAS
**Formative:**
- [Quick assessment idea 1]
- [Quick assessment idea 2]

**Summative:**
- [Major assignment idea]
- [Project or essay idea]

**Quiz Questions:**
1. [Multiple choice or short answer question]
2. [Question]
3. [Question]

CRITICAL INSTRUCTIONS:
- Write EVERYTHING in full. No shortcuts, no placeholders.
- Minimum 2,500 words for the complete notes.
- Use **bold** for key terms, *italics* for emphasis, and > blockquotes for important quotes or definitions.
- Every section must be substantive and ready to use in a real classroom.
- Calibrate complexity, vocabulary, and examples precisely for ${lv.label} (${lv.sub}).`;
}

function buildDiagramPrompt(subject, level, dtype) {
  const lv = LEVELS.find((l) => l.id === level);
  const layouts = {
    concept: "central node at (400,200) with 6 satellite nodes spread in a circle around it, connected by lines. Each satellite also has 2 small child nodes.",
    timeline: "horizontal timeline from left to right with 7 events. Main line at y=200. Events alternate above/below the line.",
    cycle: "5 process steps arranged in a circle at radius 140 from center (400,210). Arrows connect each step to the next in clockwise order.",
    hierarchy: "tree structure: 1 root at top-center (400,70), 3 branches at y=180, 2 leaves per branch at y=300. Connect with lines.",
    flow: "left-to-right flowchart with 6 steps at y=210. Include 1 diamond decision node. Arrows connect all nodes.",
    compare: "two-column comparison: left column header at (200,80), right column header at (600,80), with 5 rows of comparison points.",
    mindmap: "central topic at (400,200) with 5 main branches extending outward like a star, each branch has 2-3 sub-branches.",
    venn: "two overlapping circles: left circle center (300,200) radius 130, right circle center (500,200) radius 130. Labels in each region.",
  };

  return `Create a detailed, visually rich SVG diagram for the topic "${subject}" at ${lv?.label} level. The diagram type is: ${dtype}.

Layout guide: ${layouts[dtype] || layouts.concept}

Return ONLY valid JSON (no markdown, no explanation):
{
  "type": "${dtype}",
  "title": "diagram title (max 6 words)",
  "desc": "one clear sentence describing what this diagram shows",
  "nodes": [
    {"id": "n1", "label": "Node Label", "sublabel": "optional subtitle", "x": 400, "y": 200, "w": 120, "h": 50, "shape": "circle|rect|diamond|oval|hexagon", "color": "#hexcolor", "textColor": "#fff", "fontSize": 12}
  ],
  "edges": [
    {"from": "n1", "to": "n2", "label": "optional", "style": "solid|dashed|dotted", "color": "#hexcolor"}
  ],
  "annotations": [
    {"text": "annotation text", "x": 100, "y": 50, "color": "#hexcolor", "fontSize": 11}
  ]
}

Design rules:
- Canvas: 820 wide × 440 tall
- Nodes: x between 60-760, y between 40-400
- Use a rich, varied color palette. Pick from: #1E3A5F #C8401A #D4A847 #2D7A4F #7C3AED #2563EB #D97706 #DC2626 #0891B2 #059669 #7C3AED #B45309
- Each node must have a different color for visual distinction
- Labels must be specific to the "${subject}" topic — real content, not generic placeholders
- Add meaningful sublabels where space allows
- Include 2-3 annotations for context
- Make it educational and accurate for ${lv?.label} students`;
}

// ─── SVG Illustration Generator ──────────────────────────────────────────────
function buildIllustrationPrompt(description, subject, level) {
  const lv = LEVELS.find((l) => l.id === level) || LEVELS[3];
  return "Create a detailed, educational SVG illustration for: \"" + description + "\"\n"
    + "Subject context: " + subject + " | Level: " + lv.label + "\n\n"
    + "Return ONLY a valid JSON object (no markdown, no explanation):\n"
    + "{\n"
    + "  \"title\": \"illustration title\",\n"
    + "  \"caption\": \"one educational sentence explaining what this shows\",\n"
    + "  \"svgElements\": [\n"
    + "    {\"type\": \"rect\", \"x\": 100, \"y\": 80, \"w\": 160, \"h\": 100, \"rx\": 8, \"fill\": \"#2563EB\", \"stroke\": \"#1a4a9a\", \"strokeWidth\": 2},\n"
    + "    {\"type\": \"circle\", \"cx\": 300, \"cy\": 150, \"r\": 50, \"fill\": \"#D4A847\", \"stroke\": \"#B45309\", \"strokeWidth\": 2},\n"
    + "    {\"type\": \"ellipse\", \"cx\": 500, \"cy\": 180, \"rx\": 80, \"ry\": 45, \"fill\": \"#2D7A4F22\", \"stroke\": \"#2D7A4F\", \"strokeWidth\": 2},\n"
    + "    {\"type\": \"line\", \"x1\": 200, \"y1\": 100, \"x2\": 400, \"y2\": 250, \"stroke\": \"#C8401A\", \"strokeWidth\": 2, \"strokeDasharray\": \"5,3\"},\n"
    + "    {\"type\": \"path\", \"d\": \"M 100 200 Q 250 80 400 200\", \"fill\": \"none\", \"stroke\": \"#7C3AED\", \"strokeWidth\": 2.5},\n"
    + "    {\"type\": \"polygon\", \"points\": \"200,60 250,140 150,140\", \"fill\": \"#C8401A\", \"stroke\": \"#fff\", \"strokeWidth\": 1.5},\n"
    + "    {\"type\": \"text\", \"x\": 200, \"y\": 150, \"text\": \"Label Here\", \"fontSize\": 12, \"fontWeight\": \"600\", \"fill\": \"#fff\", \"textAnchor\": \"middle\"},\n"
    + "    {\"type\": \"arrow\", \"x1\": 300, \"y1\": 80, \"x2\": 300, \"y2\": 200, \"stroke\": \"#0D0D0D\", \"strokeWidth\": 2, \"color\": \"#0D0D0D\"},\n"
    + "    {\"type\": \"label\", \"x\": 600, \"y\": 100, \"text\": \"Component\", \"fontSize\": 11, \"fill\": \"#3D4A5C\", \"textAnchor\": \"middle\"},\n"
    + "    {\"type\": \"bracket\", \"x\": 50, \"y1\": 80, \"y2\": 240, \"text\": \"Group\", \"color\": \"#C8401A\"}\n"
    + "  ],\n"
    + "  \"background\": \"#F7F4EF\",\n"
    + "  \"width\": 820,\n"
    + "  \"height\": 360\n"
    + "}\n\n"
    + "DESIGN RULES:\n"
    + "- Canvas is 820 x 360 pixels\n"
    + "- Create 15-25 SVG elements to make a rich, detailed illustration\n"
    + "- Use real content specific to \"" + description + "\" - not generic shapes\n"
    + "- Include text labels on all major components\n"
    + "- Use varied vivid colors: #1E3A5F #C8401A #D4A847 #2D7A4F #7C3AED #2563EB #D97706 #0891B2 #059669\n"
    + "- Add arrows to show flow/direction/relationships\n"
    + "- Add bracket or annotation labels to explain parts\n"
    + "- Background: #F7F4EF or #EEF4FF or #F0FBF4 depending on topic\n"
    + "- Make it look like a real textbook illustration\n"
    + "- For biology: show cellular/anatomical structures with labels\n"
    + "- For chemistry: show molecular structures, reaction arrows, energy diagrams\n"
    + "- For physics: show force diagrams, wave patterns, circuit elements\n"
    + "- For history/geography: show maps with regions, timelines with events\n"
    + "- For maths: show graphs with axes, geometric shapes, number lines\n"
    + "- For economics: show supply/demand curves, bar charts, flow diagrams\n"
    + "- Every text element must have a contrasting color for readability\n"
    + "- Make it genuinely educational and accurate for " + lv.label + " students";
}


async function generateIllustration(description, subject, level, userPlan) {
  try {
    const raw = await callAI(buildIllustrationPrompt(description, subject, level), 2000, userPlan || "Free");
    const clean = raw.replace(/\`\`\`json\n?|\`\`\`/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
}

// ─── SVG Illustration Renderer ────────────────────────────────────────────────
function IllustrationRenderer({ data }) {
  if (!data || !data.svgElements) return null;
  const { title, caption, svgElements, background, width, height } = data;
  const W = width || 820;
  const H = height || 360;

  const renderEl = (el, i) => {
    if (el.type === "rect") {
      return <rect key={i} x={el.x} y={el.y} width={el.w} height={el.h} rx={el.rx || 4}
        fill={el.fill || "#3D4A5C"} stroke={el.stroke || "none"} strokeWidth={el.strokeWidth || 1}
        opacity={el.opacity || 1} />;
    }
    if (el.type === "circle") {
      return <circle key={i} cx={el.cx} cy={el.cy} r={el.r}
        fill={el.fill || "#C8401A"} stroke={el.stroke || "none"} strokeWidth={el.strokeWidth || 1} />;
    }
    if (el.type === "ellipse") {
      return <ellipse key={i} cx={el.cx} cy={el.cy} rx={el.rx} ry={el.ry}
        fill={el.fill || "none"} stroke={el.stroke || "#3D4A5C"} strokeWidth={el.strokeWidth || 1.5} />;
    }
    if (el.type === "line") {
      return <line key={i} x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2}
        stroke={el.stroke || "#0D0D0D"} strokeWidth={el.strokeWidth || 1.5}
        strokeDasharray={el.strokeDasharray || "none"} />;
    }
    if (el.type === "path") {
      return <path key={i} d={el.d} fill={el.fill || "none"}
        stroke={el.stroke || "#0D0D0D"} strokeWidth={el.strokeWidth || 2} />;
    }
    if (el.type === "polygon") {
      return <polygon key={i} points={el.points}
        fill={el.fill || "#C8401A"} stroke={el.stroke || "none"} strokeWidth={el.strokeWidth || 1} />;
    }
    if (el.type === "text" || el.type === "label") {
      return <text key={i} x={el.x} y={el.y} fontSize={el.fontSize || 12}
        fontWeight={el.fontWeight || "400"} fill={el.fill || "#0D0D0D"}
        textAnchor={el.textAnchor || "middle"} fontFamily="'DM Sans',sans-serif"
        style={{ pointerEvents: "none" }}>
        {el.text}
      </text>;
    }
    if (el.type === "arrow") {
      const id = "arr-ill-" + i;
      return <g key={i}>
        <defs>
          <marker id={id} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={el.color || "#0D0D0D"} />
          </marker>
        </defs>
        <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2}
          stroke={el.stroke || "#0D0D0D"} strokeWidth={el.strokeWidth || 2}
          markerEnd={"url(#" + id + ")"} />
      </g>;
    }
    if (el.type === "bracket") {
      const mid = (el.y1 + el.y2) / 2;
      const bx = (el.x || 50);
      return <g key={i}>
        <path d={"M " + (bx + 12) + " " + el.y1 + " L " + bx + " " + el.y1 + " L " + bx + " " + el.y2 + " L " + (bx + 12) + " " + el.y2}
          fill="none" stroke={el.color || "#C8401A"} strokeWidth="1.5" />
        <text x={bx - 4} y={mid + 4} fontSize="10" fill={el.color || "#C8401A"}
          textAnchor="end" fontFamily="'DM Sans',sans-serif" transform={"rotate(-90," + (bx - 4) + "," + mid + ")"}>
          {el.text}
        </text>
      </g>;
    }
    return null;
  };

  return (
    <div style={{ margin: "1.1rem 0", borderRadius: 12, overflow: "hidden", border: "1px solid #D8D2C8", background: background || "#F7F4EF" }}>
      <div style={{ background: "#0D0D0D", padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: ".65rem", color: "#D4A847", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>📐 Illustration</span>
        <span style={{ fontSize: ".78rem", color: "#fff", fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", minWidth: 260, display: "block", background: background || "#F7F4EF" }}>
          {svgElements.map(renderEl)}
        </svg>
      </div>
      {caption && (
        <div style={{ padding: "8px 14px", background: "#0D0D0D0a", borderTop: "1px solid #D8D2C8" }}>
          <p style={{ fontSize: ".77rem", color: "#3D4A5C", margin: 0, lineHeight: 1.55, fontStyle: "italic" }}>
            <strong style={{ color: "#C8401A", fontStyle: "normal" }}>Figure: </strong>{caption}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── SVG Diagram Renderer ─────────────────────────────────────────────────────
function DiagramRenderer({ data }) {
  if (!data || !data.nodes) return null;
  const { type, title, desc, nodes = [], edges = [], annotations = [] } = data;
  const nm = {};
  nodes.forEach((n) => { nm[n.id] = n; });

  const renderNode = (n) => {
    const w = n.w || 110; const h = n.h || 44;
    const fill = n.color || "#3D4A5C";
    const tc = n.textColor || "#fff";
    const fs = n.fontSize || 11;
    const lbl = n.label || "";
    const sub = n.sublabel || "";

    let shapeEl;
    if (n.shape === "diamond") {
      const hw = w / 2; const hh = h / 2;
      const pts = `${n.x},${n.y - hh} ${n.x + hw},${n.y} ${n.x},${n.y + hh} ${n.x - hw},${n.y}`;
      shapeEl = <polygon points={pts} fill={fill} stroke="#fff" strokeWidth="2" filter="url(#shadow)" />;
    } else if (n.shape === "circle" || n.shape === "oval") {
      const rx = w / 2; const ry = (n.shape === "circle" ? rx : h / 2);
      shapeEl = <ellipse cx={n.x} cy={n.y} rx={rx} ry={ry} fill={fill} stroke="#fff" strokeWidth="2" filter="url(#shadow)" />;
    } else if (n.shape === "hexagon") {
      const r = Math.min(w, h) / 2;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 180) * (60 * i - 30);
        return `${n.x + r * Math.cos(a)},${n.y + r * Math.sin(a)}`;
      }).join(" ");
      shapeEl = <polygon points={pts} fill={fill} stroke="#fff" strokeWidth="2" filter="url(#shadow)" />;
    } else {
      shapeEl = <rect x={n.x - w / 2} y={n.y - h / 2} width={w} height={h} rx={8} fill={fill} stroke="#fff" strokeWidth="2" filter="url(#shadow)" />;
    }

    const maxLbl = lbl.length > 16 ? lbl.slice(0, 15) + "…" : lbl;
    const maxSub = sub.length > 18 ? sub.slice(0, 17) + "…" : sub;

    return (
      <g key={n.id}>
        {shapeEl}
        <text x={n.x} y={n.y + (sub ? -4 : 4)} textAnchor="middle"
          fontSize={fs} fontFamily="'DM Sans',sans-serif" fontWeight="600" fill={tc}
          style={{ pointerEvents: "none" }}>
          {maxLbl}
        </text>
        {sub && (
          <text x={n.x} y={n.y + 11} textAnchor="middle"
            fontSize={Math.max(8, fs - 2)} fontFamily="'DM Sans',sans-serif" fontWeight="400"
            fill={tc} opacity={0.8} style={{ pointerEvents: "none" }}>
            {maxSub}
          </text>
        )}
      </g>
    );
  };

  const renderEdge = (e, i) => {
    const a = nm[e.from]; const b = nm[e.to];
    if (!a || !b) return null;
    const dashArr = e.style === "dashed" ? "6,4" : e.style === "dotted" ? "2,3" : "none";
    const ec = e.color || "#D8D2C8";
    const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
    return (
      <g key={i}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke={ec} strokeWidth="2" strokeDasharray={dashArr}
          markerEnd="url(#arrowhead)" />
        {e.label && (
          <text x={mx} y={my - 6} textAnchor="middle" fontSize="9"
            fontFamily="'DM Sans',sans-serif" fill="#8A8F9A"
            style={{ pointerEvents: "none" }}>
            {e.label}
          </text>
        )}
      </g>
    );
  };

  return (
    <div style={{ background: "linear-gradient(135deg,#F7F4EF,#EDE8DF)", borderRadius: 14, border: "1px solid #D8D2C8", padding: "1rem", marginTop: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: ".92rem", color: "#0D0D0D" }}>{title}</span>
        <span style={{ marginLeft: "auto", fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", background: "#D4A84722", color: "#B45309", border: "1px solid #D4A84744", borderRadius: 20, padding: "2px 9px" }}>
          {type}
        </span>
      </div>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #D8D2C8", overflowX: "auto" }}>
        <svg viewBox="0 0 820 440" style={{ width: "100%", minWidth: 340, display: "block" }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#8A8F9A" />
            </marker>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00000022" />
            </filter>
          </defs>
          {type === "timeline" && (
            <>
              <line x1="60" y1="200" x2="760" y2="200" stroke="#D8D2C8" strokeWidth="3" />
              <polygon points="756,194 770,200 756,206" fill="#D8D2C8" />
            </>
          )}
          {type === "cycle" && (
            <circle cx="410" cy="210" r="145" fill="none" stroke="#EDE8DF" strokeWidth="2" strokeDasharray="6,4" />
          )}
          {type === "venn" && (
            <>
              <ellipse cx="300" cy="200" rx="130" ry="110" fill="#2563EB11" stroke="#2563EB44" strokeWidth="2" />
              <ellipse cx="500" cy="200" rx="130" ry="110" fill="#C8401A11" stroke="#C8401A44" strokeWidth="2" />
            </>
          )}
          {edges.map(renderEdge)}
          {nodes.map(renderNode)}
          {annotations.map((a, i) => (
            <text key={i} x={a.x} y={a.y} textAnchor="middle" fontSize={a.fontSize || 10}
              fontFamily="'DM Sans',sans-serif" fill={a.color || "#8A8F9A"} fontStyle="italic">
              {a.text}
            </text>
          ))}
        </svg>
      </div>
      {desc && <p style={{ fontSize: ".78rem", color: "#8A8F9A", marginTop: 7, fontStyle: "italic", lineHeight: 1.5 }}>{desc}</p>}
    </div>
  );
}

// ─── Markdown → Structured HTML ───────────────────────────────────────────────
function parseMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\|(.+)\|/g, (m) => {
      const cells = m.split("|").filter((c) => c.trim() && !c.match(/^[-\s]+$/));
      return "<tr>" + cells.map((c) => `<td style="padding:6px 12px;border:1px solid #D8D2C8;font-size:.84rem">${c.trim()}</td>`).join("") + "</tr>";
    })
    .replace(/(<tr>.*<\/tr>\n?)+/gs, (m) => `<table style="border-collapse:collapse;width:100%;margin:.75rem 0;border-radius:8px;overflow:hidden">${m}</table>`)
    .replace(/^# (.+)$/gm, "<h1 style=\"font-family:'Playfair Display',serif;font-size:1.85rem;font-weight:900;color:#0D0D0D;line-height:1.2;margin-bottom:.75rem\">$1</h1>")
    .replace(/^## (.+)$/gm, (_, s) => {
      const sKey = s.replace(/[^a-zA-Z ]/g, "").trim().toUpperCase();
      const colors = {
        "COURSE INFORMATION": "#3D4A5C", "LEARNING OBJECTIVES": "#2D7A4F",
        "INTRODUCTION": "#2563EB", "MAIN BODY": "#C8401A",
        "KEY CONCEPTS": "#7C3AED", "WORKED EXAMPLES": "#D97706",
        "DISCUSSION QUESTIONS": "#D4A847", "ACTIVITIES": "#0891B2",
        "CONCLUSION": "#0D0D0D", "SUMMARY": "#2D7A4F",
        "RECOMMENDED": "#3D4A5C", "ASSESSMENT": "#C8401A",
      };
      const col = Object.entries(colors).find(([k]) => sKey.includes(k))?.[1] || "#3D4A5C";
      return `<h2 style="font-family:'Playfair Display',serif;font-size:1.15rem;font-weight:700;color:${col};margin:1.75rem 0 .6rem;padding:.5rem .85rem;border-left:4px solid ${col};border-radius:0 6px 6px 0;background:${col}0d">${s}</h2>`;
    })
    .replace(/^### (.+)$/gm, "<h3 style=\"font-size:1rem;font-weight:700;color:#0D0D0D;margin:1.1rem 0 .4rem;padding:.35rem .65rem;background:#F7F4EF;border-left:3px solid #C8401A;border-radius:0 5px 5px 0\">$1</h3>")
    .replace(/^> (.+)$/gm, "<blockquote style=\"border-left:4px solid #D4A847;padding:.6rem 1rem;background:#FFFBF0;color:#3D4A5C;font-style:italic;margin:.85rem 0;border-radius:0 8px 8px 0\">$1</blockquote>")
    .replace(/\*\*(.+?)\*\*/g, "<strong style=\"color:#C8401A;font-weight:700\">$1</strong>")
    .replace(/\*(.+?)\*/g, "<em style=\"color:#3D4A5C\">$1</em>")
    .replace(/`([^`]+)`/g, "<code style=\"background:#EDE8DF;padding:2px 6px;border-radius:4px;font-size:.87em;font-family:monospace\">$1</code>")
    .replace(/^---$/gm, "<hr style=\"border:none;border-top:2px solid #EDE8DF;margin:1.25rem 0\"/>")
    .replace(/^\d+\. (.+)$/gm, "<li style=\"margin-bottom:.4rem;line-height:1.8\">$1</li>")
    .replace(/^[-*] (.+)$/gm, "<li style=\"margin-bottom:.4rem;line-height:1.8\">$1</li>")
    .replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, (m) => `<ul style="margin:.5rem 0 1rem 1.4rem;padding:0">${m}</ul>`)
    .replace(/\n\n/g, "</p><p style=\"line-height:1.9;margin-bottom:.9rem;color:#1a1a1a\">")
    .replace(/^(?!<)/gm, "<p style=\"line-height:1.9;margin-bottom:.9rem;color:#1a1a1a\">");
}

// ─── Note Document Component ──────────────────────────────────────────────────
function NoteDocument({ form, text, diagrams, illustrations }) {
  const lv = LEVELS.find((l) => l.id === form.level) || LEVELS[3];
  const fmt = FORMATS.find((f) => f.id === form.format) || FORMATS[0];

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>
      {/* Cover Header */}
      <div style={{ background: "linear-gradient(135deg,#0D0D0D 0%,#1a2744 100%)", padding: "clamp(1.1rem,3vw,2rem) clamp(1rem,3vw,2rem) clamp(1rem,2.5vw,1.75rem)", borderRadius: "13px 13px 0 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: ".7rem", color: "#D4A847", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: ".5rem" }}>
              LectureForge AI  ·  Lecture Notes
            </div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.3rem,3vw,1.9rem)", fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: ".75rem" }}>
              {form.subject}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
              {[
                { icon: lv.icon, text: lv.label },
                { icon: "⏱", text: form.duration },
                { icon: "📐", text: fmt.label },
                { icon: "📅", text: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
              ].map((item) => (
                <span key={item.text} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#ffffff14", border: "1px solid #ffffff22", borderRadius: 20, padding: "4px 12px", fontSize: ".75rem", color: "#ddd" }}>
                  {item.icon} {item.text}
                </span>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: ".68rem", color: "#aaa", lineHeight: 1.6 }}>
              Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
            <div style={{ fontSize: ".68rem", color: "#666", marginTop: 2 }}>lectureforge.ng</div>
          </div>
        </div>
        {/* Progress sections indicator */}
        <div style={{ display: "flex", gap: 4, marginTop: "1.25rem", flexWrap: "wrap" }}>
          {["Header", "Objectives", "Intro", "Body", "Key Concepts", "Examples", "Discussion", "Conclusion", "Resources"].map((s) => (
            <span key={s} style={{ fontSize: ".62rem", background: "#D4A84722", color: "#D4A847", borderRadius: 10, padding: "2px 8px", fontWeight: 600 }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Note Body - split on illustration markers */}
      <div style={{ padding: "clamp(1rem,3vw,1.75rem) clamp(.9rem,3vw,2rem)", background: "#FDFBF8", borderRadius: "0 0 13px 13px", borderTop: "none" }}>
        {(() => {
          // Split text on [ILLUSTRATION: ...] markers
          const parts = text.split(/\[ILLUSTRATION:\s*([^\]]+)\]/g);
          const elements = [];
          for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 0) {
              // Text segment
              if (parts[i].trim()) {
                elements.push(
                  <div key={"t" + i} dangerouslySetInnerHTML={{ __html: parseMarkdown(parts[i]) }} />
                );
              }
            } else {
              // Illustration slot — look up pre-generated illustration
              const illIdx = Math.floor(i / 2);
              const illData = illustrations && illustrations[illIdx];
              if (illData) {
                elements.push(<IllustrationRenderer key={"ill" + i} data={illData} />);
              } else {
                // Placeholder while loading
                elements.push(
                  <div key={"ph" + i} style={{ margin: "1rem 0", padding: "1rem", background: "#F7F4EF", border: "1px dashed #D8D2C8", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: ".8rem", color: "#8A8F9A" }}>📐 Illustration loading: <em>{parts[i]}</em></div>
                  </div>
                );
              }
            }
          }
          return elements;
        })()}

        {/* Inline diagrams */}
        {diagrams && diagrams.length > 0 && (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.15rem", fontWeight: 700, color: "#7C3AED", margin: "1.75rem 0 .6rem", padding: ".5rem .85rem", borderLeft: "4px solid #7C3AED", borderRadius: "0 6px 6px 0", background: "#7C3AED0d" }}>
              📊 Visual Diagrams
            </h2>
            {diagrams.map((d, i) => <DiagramRenderer key={i} data={d} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
function exportPDF(form, text, diagrams) {
  const lv = LEVELS.find((l) => l.id === form.level) || LEVELS[3];
  const fmt = FORMATS.find((f) => f.id === form.format) || FORMATS[0];

  const nm = (nodes) => { const m = {}; (nodes || []).forEach((n) => { m[n.id] = n; }); return m; };
  const svgForPDF = (d) => {
    const m = nm(d.nodes);
    const edges = (d.edges || []).map((e) => {
      const a = m[e.from]; const b = m[e.to];
      if (!a || !b) return "";
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${e.color || "#D8D2C8"}" stroke-width="2" marker-end="url(#pa)"/>`;
    }).join("");
    const nodes2 = (d.nodes || []).map((n) => {
      const lbl = (n.label || "").slice(0, 16);
      const c = n.color || "#3D4A5C";
      const w = n.w || 110; const h = n.h || 44;
      let s;
      if (n.shape === "circle" || n.shape === "oval") {
        s = `<ellipse cx="${n.x}" cy="${n.y}" rx="${w / 2}" ry="${n.shape === "circle" ? w / 2 : h / 2}" fill="${c}" stroke="white" stroke-width="2"/>`;
      } else if (n.shape === "diamond") {
        s = `<polygon points="${n.x},${n.y - h / 2} ${n.x + w / 2},${n.y} ${n.x},${n.y + h / 2} ${n.x - w / 2},${n.y}" fill="${c}" stroke="white" stroke-width="2"/>`;
      } else {
        s = `<rect x="${n.x - w / 2}" y="${n.y - h / 2}" width="${w}" height="${h}" rx="7" fill="${c}" stroke="white" stroke-width="2"/>`;
      }
      return s + `<text x="${n.x}" y="${n.y + 4}" text-anchor="middle" font-size="10" font-family="sans-serif" font-weight="600" fill="${n.textColor || "#fff"}">${lbl}</text>`;
    }).join("");
    return `<div style="margin:14px 0;padding:12px;border:1px solid #D8D2C8;border-radius:8px;background:#EDE8DF">
      <div style="font-weight:700;font-size:13px;margin-bottom:8px">${d.title || ""}</div>
      <svg viewBox="0 0 820 440" style="width:100%;background:#fff;border-radius:7px" xmlns="http://www.w3.org/2000/svg">
        <defs><marker id="pa" markerWidth="8" markerHeight="8" refX="8" refY="3.5" orient="auto"><polygon points="0 0,8 3.5,0 7" fill="#8A8F9A"/></marker></defs>
        ${edges}${nodes2}
      </svg>
      ${d.desc ? `<p style="font-size:11px;color:#8A8F9A;margin-top:5px;font-style:italic">${d.desc}</p>` : ""}
    </div>`;
  };

  const body = parseMarkdown(text).replace(/style="[^"]*font-family[^"]*Playfair[^"]*"/g, 'style="font-family:Georgia,serif;font-weight:900"');
  const diagsHtml = (diagrams || []).filter(Boolean).map(svgForPDF).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${form.subject} – Lecture Notes</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  @page{size:A4;margin:16mm 15mm}
  body{font-family:'DM Sans',Georgia,sans-serif;color:#0D0D0D;font-size:12.5px;line-height:1.8;background:#fff}
  h1{font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:900;margin-bottom:14px;line-height:1.2}
  h2{font-family:'Playfair Display',Georgia,serif;font-size:16px;font-weight:700;margin:20px 0 8px;padding:6px 12px;border-left:4px solid #C8401A;border-radius:0 5px 5px 0;background:#C8401A0d;color:#C8401A}
  h3{font-size:13px;font-weight:700;margin:14px 0 5px;padding:4px 10px;background:#F7F4EF;border-left:3px solid #C8401A;border-radius:0 4px 4px 0}
  p{margin-bottom:9px;line-height:1.8} ul,ol{margin:5px 0 10px 20px} li{margin-bottom:4px}
  strong{color:#C8401A;font-weight:700} em{color:#3D4A5C;font-style:italic}
  blockquote{border-left:4px solid #D4A847;padding:6px 12px;background:#FFFBF0;color:#3D4A5C;font-style:italic;margin:10px 0}
  table{border-collapse:collapse;width:100%;margin:10px 0} td,th{padding:6px 12px;border:1px solid #D8D2C8;font-size:12px}
  code{background:#EDE8DF;padding:1px 5px;border-radius:3px;font-size:11px}
  hr{border:none;border-top:2px solid #EDE8DF;margin:14px 0}
  .cover{background:linear-gradient(135deg,#0D0D0D,#1a2744);color:#fff;padding:28px;margin-bottom:22px;border-radius:8px}
  .cover-logo{font-size:11px;color:#D4A847;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}
  .cover-title{font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:900;line-height:1.2;margin-bottom:12px}
  .cover-meta{display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:#aaa}
  footer{text-align:center;font-size:10px;color:#bbb;margin-top:28px;padding-top:10px;border-top:1px solid #eee}
</style></head><body>
<div class="cover">
  <div class="cover-logo">LectureForge AI  ·  Lecture Notes</div>
  <div class="cover-title">${form.subject}</div>
  <div class="cover-meta">
    <span>${lv.icon} ${lv.label}</span>
    <span>⏱ ${form.duration}</span>
    <span>📐 ${fmt.label}</span>
    <span>📅 ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
  </div>
</div>
<div>${body}</div>
${diagsHtml ? `<div style="margin-top:22px"><h2 style="color:#7C3AED;border-left-color:#7C3AED;background:#7C3AED0d">📊 Visual Diagrams</h2>${diagsHtml}</div>` : ""}
<footer>LectureForge AI  ·  lectureforge.ng  ·  ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</footer>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Please allow popups to export PDF."); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 1000);
}

// ─── Shared style primitives ──────────────────────────────────────────────────
const INP = { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #D8D2C8", background: "#fff", fontFamily: "inherit", fontSize: ".9rem", color: "#0D0D0D", outline: "none" };
const BTN = (bg, extra) => Object.assign({ background: bg, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: ".85rem", fontWeight: 700, fontFamily: "inherit", transition: "opacity .15s" }, extra || {});
const CARD = (ex) => Object.assign({ background: "#FDFBF8", border: "1px solid #D8D2C8", borderRadius: 14, padding: "1.35rem" }, ex || {});

// ════════════════════════════════════════════════════════════════════════════════
export default function App() {

  // All state at top level
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [authTab, setAuthTab] = useState("login");
  const [loginErr, setLoginErr] = useState("");
  const [sName, setSName] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPass, setSPass] = useState("");
  const [sPass2, setSPass2] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [logoN, setLogoN] = useState(0);
  const [form, setForm] = useState({ subject: "", level: "undergrad", duration: "1 hour", format: "full", objectives: "", style: "Engaging, example-driven and interactive" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [genErr, setGenErr] = useState("");
  const [diagrams, setDiagrams] = useState([]);
  const [diagLoading, setDiagLoading] = useState(false);
  const [selDiag, setSelDiag] = useState([]);
  const [copied, setCopied] = useState(false);
  const [illustrations, setIllustrations] = useState([]);
  const [illLoading, setIllLoading] = useState(false);
  const [modelInfo, setModelInfo] = useState<{name:string;badge:string}|null>(null);
  const [used, setUsed] = useState(0);
  const [hist, setHist] = useState([
    { sub: "Quantum Entanglement",  lv: "PhD / Research", dt: "May 8, 2026" },
    { sub: "Photosynthesis",        lv: "Middle School",  dt: "May 6, 2026" },
    { sub: "The French Revolution", lv: "High School",    dt: "May 3, 2026" },
  ]);
  const [aUsers, setAUsers] = useState([
    { id: 1, name: "Amaka Obi",     email: "amaka@school.ng",   plan: "Free",  joined: "May 1, 2026"  },
    { id: 2, name: "Emeka Nwosu",   email: "emeka@uni.edu.ng",  plan: "Basic", joined: "Apr 20, 2026" },
    { id: 3, name: "Fatima Bello",  email: "fatima@college.ng", plan: "Pro",   joined: "Apr 15, 2026" },
    { id: 4, name: "Tunde Adeyemi", email: "tunde@lagos.edu",   plan: "Free",  joined: "May 5, 2026"  },
    { id: 5, name: "Ngozi Eze",     email: "ngozi@phd.edu.ng",  plan: "Basic", joined: "May 7, 2026"  },
  ]);
  const [nuName, setNuName] = useState("");
  const [nuEmail, setNuEmail] = useState("");
  const [nuPlan, setNuPlan] = useState("Basic");
  const [addErr, setAddErr] = useState("");
  const [addOk, setAddOk] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("Free"); // plan chosen before signup

  const plan = user?.plan || null;
  const isAdmin = user?.isAdmin || false;
  const limit = PLAN_LIMITS[plan] || 0;
  const canGenerate = user && used < limit;

  // ── Handlers ─────────────────────────────────────────────────────────────
  function onLogoClick() {
    const n = logoN + 1; setLogoN(n);
    if (n >= 5) { setShowAdmin(true); setLogoN(0); }
    setPage("home");
  }

  function doLogin() {
    if (!email) { setLoginErr("Enter your email."); return; }
    if (!pass) { setLoginErr("Enter your password."); return; }
    if (email === "admin@lectureforge.ai" && pass === "Admin@2026") {
      setUser({ name: "Admin", plan: "Institution", isAdmin: true });
      setLoginErr(""); setPage("home");
    } else if (pass.length >= 6) {
      setUser({ name: email.split("@")[0], plan: "Free", isAdmin: false });
      setLoginErr(""); setPage("home");
    } else { setLoginErr("Password must be 6+ characters."); }
  }

  function doSignup() {
    if (!sName.trim()) { setLoginErr("Name required."); return; }
    if (!sEmail || !sEmail.includes("@")) { setLoginErr("Valid email required."); return; }
    if (sPass.length < 6) { setLoginErr("Password must be 6+ characters."); return; }
    if (sPass !== sPass2) { setLoginErr("Passwords do not match."); return; }
    setUser({ name: sName.trim(), plan: "Free", isAdmin: false });
    setLoginErr(""); setPage("home");
  }

  async function doGenerate() {
    if (!form.subject.trim()) { setGenErr("Please enter a subject."); return; }
    if (!user) { setSelectedPlan("Free"); setAuthTab("signup"); setPage("login"); return; }
    if (used >= limit) { setShowPrice(true); return; } // Free = 1, Starter = 15, Basic = 40, Pro = 100
    setLoading(true); setGenErr(""); setResult(""); setDiagrams([]); setSelDiag([]); setIllustrations([]); setPage("result");
    try {
      const usePremium = PREMIUM_PLANS.includes(plan || "Free");
      setModelInfo(usePremium
        ? { name: "Claude Sonnet", badge: "⭐ Premium AI" }
        : { name: "Gemini 2.0 Flash", badge: "✨ AI" }
      );
      const txt = await callAI(buildNotesPrompt(form), 8000, plan || "Free");
      setResult(txt);
      setUsed((n) => n + 1);
      setHist((h) => [{ sub: form.subject, lv: LEVELS.find((l) => l.id === form.level)?.label || form.level, dt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }, ...h.slice(0, 9)]);
      // Auto-generate illustrations for markers found in the text
      const illMatches = [...txt.matchAll(/\[ILLUSTRATION:\s*([^\]]+)\]/g)];
      if (illMatches.length > 0) {
        setIllLoading(true);
        const illResults = await Promise.all(
          illMatches.slice(0, 4).map((m) => generateIllustration(m[1].trim(), form.subject, form.level, plan || "Free"))
        );
        setIllustrations(illResults.filter(Boolean));
        setIllLoading(false);
      }
    } catch {
      setGenErr("Generation failed. Please try again.");
    }
    setLoading(false);
  }

  function toggleDiag(id) {
    setSelDiag((s) => s.includes(id) ? s.filter((x) => x !== id) : s.length < 3 ? [...s, id] : s);
  }

  async function doGenDiagrams() {
    if (selDiag.length === 0) return;
    setDiagLoading(true);
    const results = await Promise.all(
      selDiag.slice(0, 3).map(async (dtype) => {
        try {
          const raw = await callAI(buildDiagramPrompt(form.subject, form.level, dtype), 2000, plan || "Free");
          return JSON.parse(raw.replace(/```json\n?|```/g, "").trim());
        } catch { return null; }
      })
    );
    setDiagrams((d) => [...d, ...results.filter(Boolean)]);
    setDiagLoading(false);
  }

  function doCopy() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function doAddUser() {
    setAddErr(""); setAddOk("");
    if (!nuName.trim()) { setAddErr("Name required."); return; }
    if (!nuEmail || !nuEmail.includes("@")) { setAddErr("Valid email required."); return; }
    if (aUsers.find((u) => u.email === nuEmail)) { setAddErr("Email already exists."); return; }
    setAUsers((us) => [...us, { id: Date.now(), name: nuName.trim(), email: nuEmail.trim(), plan: nuPlan, joined: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }]);
    setNuName(""); setNuEmail(""); setNuPlan("Basic");
    setAddOk("User added to " + nuPlan + " plan."); setTimeout(() => setAddOk(""), 3000);
  }

  function changePlan(uid, p) {
    setAUsers((us) => us.map((u) => u.id === uid ? { ...u, plan: p } : u));
  }

  // ── Nav ───────────────────────────────────────────────────────────────────
  function Nav() {
    return (
      <nav className="lf-nav">
        <button onClick={onLogoClick} className="lf-nav-logo">
          <span style={{ color: "#D4A847" }}>L</span>ecture<span style={{ color: "#C8401A" }}>F</span>orge
        </button>
        <div className="lf-nav-links">
          {user && (
            <button onClick={() => setPage("history")} className="lf-nav-history">History</button>
          )}
          <button onClick={() => setShowPrice(true)} className="lf-nav-pricing">Pricing</button>
          {user ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {isAdmin && (
                <button onClick={() => setShowAdmin(true)} style={BTN(C.slate, { padding: "5px 10px", fontSize: ".75rem", borderRadius: 8 })}>Admin</button>
              )}
              <div title="Sign out" onClick={() => { setUser(null); setUsed(0); }} className="lf-avatar">
                {user.name[0].toUpperCase()}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button onClick={() => { setAuthTab("login"); setPage("login"); }} style={{ background: "none", border: "1px solid #ffffff33", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                Sign In
              </button>
              <button onClick={() => { setSelectedPlan("Free"); setAuthTab("signup"); setPage("login"); }} style={BTN(C.accent, { padding: "6px 12px", fontSize: ".8rem", borderRadius: 8, whiteSpace: "nowrap" })}>
                Sign Up Free
              </button>
            </div>
          )}
        </div>
      </nav>
    );
  }

  // ── HOME ─────────────────────────────────────────────────────────────────
  if (page === "home") return (
    <div style={{ fontFamily: "'DM Sans',Arial,sans-serif", minHeight: "100vh", background: "#F7F4EF" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900&family=DM+Sans:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        @keyframes marquee   { from { transform:translateX(0); } to { transform:translateX(-50%); } }
        @keyframes fadeUp    { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseDot  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }
        @keyframes spin      { to { transform:rotate(360deg); } }

        .lf-fade-up   { animation: fadeUp .5s cubic-bezier(.22,1,.36,1) both; }
        .lf-card-hover{ transition: transform .2s, box-shadow .2s; }
        .lf-card-hover:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,.1); }

        /* ── NAV ── */
        .lf-nav { position:sticky; top:0; z-index:200; background:#0D0D0D;
          height:58px; padding:0 1.5rem; display:flex; align-items:center;
          justify-content:space-between; gap:.75rem; border-bottom:1px solid #1a1a1a; }
        .lf-nav-logo { background:none; border:none; cursor:pointer;
          font-family:'Playfair Display',serif; font-size:1.25rem;
          font-weight:900; color:#fff; white-space:nowrap; flex-shrink:0; }
        .lf-nav-links { display:flex; gap:.5rem; align-items:center; flex-wrap:nowrap; }
        .lf-nav-history { background:none; border:none; color:#888; cursor:pointer;
          font-family:inherit; font-size:.82rem; white-space:nowrap; }
        .lf-nav-pricing { background:none; border:1px solid #D4A84755; color:#D4A847;
          cursor:pointer; font-family:inherit; font-size:.79rem;
          padding:5px 10px; border-radius:8px; font-weight:700; white-space:nowrap; }
        .lf-avatar { background:#C8401A; color:#fff; border-radius:50%;
          width:30px; height:30px; display:flex; align-items:center; justify-content:center;
          font-weight:700; font-size:.82rem; cursor:pointer; flex-shrink:0;
          font-family:'Playfair Display',serif; }

        /* ── HERO ── */
        .lf-hero { padding:6rem 1.5rem 4.5rem; }
        .lf-hero-preview { position:relative; margin-top:3.5rem;
          width:min(700px,92vw); margin-inline:auto; }
        .lf-preview-badge-r { position:absolute; top:28px; right:-16px;
          background:#2D7A4F; color:#fff; border-radius:20px; padding:7px 14px;
          font-size:.7rem; font-weight:700; border:2px solid #fff;
          box-shadow:0 6px 20px rgba(45,122,79,.45); white-space:nowrap; }
        .lf-preview-badge-l { position:absolute; bottom:36px; left:-16px;
          background:#7C3AED; color:#fff; border-radius:20px; padding:7px 14px;
          font-size:.7rem; font-weight:700; border:2px solid #fff;
          box-shadow:0 6px 20px rgba(124,58,237,.45); white-space:nowrap; }

        /* ── STATS BAR ── */
        .lf-stats { background:#0D0D0D; padding:.9rem 1.5rem;
          display:flex; justify-content:center; gap:1.75rem;
          flex-wrap:wrap; border-bottom:1px solid #1a1a1a; }

        /* ── FEATURES GRID ── */
        .lf-features-grid { display:grid;
          grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
          gap:1rem; margin-bottom:2.5rem; }

        /* ── HOW IT WORKS ── */
        .lf-steps { display:grid;
          grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
          gap:0; margin-bottom:2.5rem; }
        .lf-step-connector { position:absolute; top:2.2rem; right:0;
          width:50%; height:2px;
          background:linear-gradient(90deg,#C8401A,#EDE8DF); }

        /* ── GENERATE FORM ── */
        .lf-level-grid { display:grid;
          grid-template-columns:repeat(auto-fill,minmax(115px,1fr));
          gap:.45rem; }
        .lf-form-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }

        /* ── RESULT TOOLBAR ── */
        .lf-toolbar { display:flex; justify-content:space-between;
          align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:.75rem; }
        .lf-toolbar-left { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; }
        .lf-toolbar-right { display:flex; gap:.5rem; flex-wrap:wrap; }

        /* ── DIAGRAM PICKER ── */
        .lf-diag-grid { display:grid;
          grid-template-columns:repeat(auto-fill,minmax(105px,1fr));
          gap:.45rem; margin-bottom:.9rem; }

        /* ── PRICING MODAL ── */
        .lf-pricing-grid { display:grid;
          grid-template-columns:repeat(auto-fit,minmax(185px,1fr));
          gap:.85rem; }

        /* ── ADMIN PANEL ── */
        .lf-admin-stats { display:grid;
          grid-template-columns:repeat(auto-fit,minmax(120px,1fr));
          gap:.7rem; margin-bottom:1.5rem; }
        .lf-admin-user { display:flex; align-items:center;
          justify-content:space-between; flex-wrap:wrap; gap:.65rem; padding:.9rem 1.05rem; }
        .lf-admin-add-grid { display:grid;
          grid-template-columns:1fr 1fr; gap:.65rem; margin-bottom:.65rem; }

        /* ── NOTE DOCUMENT ── */
        .lf-note-header { padding:2rem 2rem 1.75rem; }
        .lf-note-body   { padding:1.75rem 2rem; }

        /* ── MOBILE OVERRIDES ── */
        @media (max-width: 640px) {
          /* Nav */
          .lf-nav { height:auto; min-height:54px; padding:.65rem 1rem; flex-wrap:wrap; gap:.5rem; }
          .lf-nav-logo { font-size:1.1rem; }
          .lf-nav-history { display:none; }
          .lf-nav-pricing { font-size:.72rem; padding:4px 8px; }

          /* Hero */
          .lf-hero { padding:4rem 1rem 3rem; }
          .lf-hero-preview { width:100%; margin-top:2.5rem; }
          .lf-preview-badge-r { right:-8px; font-size:.62rem; padding:5px 10px; }
          .lf-preview-badge-l { left:-8px; font-size:.62rem; padding:5px 10px; }

          /* Stats */
          .lf-stats { gap:1rem; padding:.75rem 1rem; }

          /* Features */
          .lf-features-grid { grid-template-columns:1fr 1fr; gap:.75rem; }

          /* How it works */
          .lf-steps { grid-template-columns:1fr 1fr; }
          .lf-step-connector { display:none; }

          /* Form */
          .lf-level-grid { grid-template-columns:repeat(3,1fr); }
          .lf-form-row { grid-template-columns:1fr; gap:.75rem; }

          /* Pricing modal */
          .lf-pricing-grid { grid-template-columns:1fr; }

          /* Admin */
          .lf-admin-stats { grid-template-columns:repeat(2,1fr); }
          .lf-admin-add-grid { grid-template-columns:1fr; }

          /* Note */
          .lf-note-header { padding:1.25rem 1rem; }
          .lf-note-body   { padding:1.25rem 1rem; }

          /* Diagram picker */
          .lf-diag-grid { grid-template-columns:repeat(4,1fr); }

          /* Toolbar */
          .lf-toolbar { flex-direction:column; align-items:flex-start; }
        }

        @media (max-width: 400px) {
          .lf-features-grid { grid-template-columns:1fr; }
          .lf-level-grid    { grid-template-columns:repeat(2,1fr); }
          .lf-steps         { grid-template-columns:1fr; }
          .lf-diag-grid     { grid-template-columns:repeat(3,1fr); }
          .lf-admin-stats   { grid-template-columns:1fr 1fr; }
        }

        @media (min-width: 641px) and (max-width: 860px) {
          .lf-hero { padding:5rem 1.5rem 4rem; }
          .lf-pricing-grid { grid-template-columns:repeat(3,1fr); }
          .lf-admin-add-grid { grid-template-columns:1fr 1fr; }
        }
      `}</style>
      <Nav />

      {/* ── HERO ── */}
      <div style={{ background: "linear-gradient(160deg,#0D0D0D 0%,#0f1d35 50%,#0D0D0D 100%)", padding: "clamp(4rem,8vw,6rem) 1.25rem clamp(3rem,5vw,4.5rem)", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "15%", left: "8%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, #C8401A18 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", top: "20%", right: "6%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, #D4A84712 0%, transparent 70%)" }} />
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .04 }}>
            <defs><pattern id="lf-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#fff" strokeWidth=".5"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#lf-grid)"/>
          </svg>
        </div>
        <div className="lf-fade-up" style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#D4A84722", border: "1px solid #D4A84744", borderRadius: 30, padding: "6px 18px", fontSize: ".74rem", fontWeight: 700, color: "#D4A847", marginBottom: "1.4rem", letterSpacing: ".08em", textTransform: "uppercase" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#D4A847", animation: "pulseDot 1.5s ease-in-out infinite", display: "inline-block" }}/>
            AI-Powered Lecture Generation
          </div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(2.2rem,5.5vw,4rem)", fontWeight: 900, color: "#fff", lineHeight: 1.08, marginBottom: "1.1rem" }}>
            Lecture Notes that are<br />
            <span style={{ color: "#D4A847", fontStyle: "italic" }}>complete,</span>{" "}
            <span style={{ color: "#C8401A" }}>illustrated</span><br />
            and ready to teach.
          </h1>
          <p style={{ color: "#9ca3af", lineHeight: 1.85, marginBottom: "2.25rem", fontSize: "1rem", maxWidth: 540, marginInline: "auto" }}>
            Generate 3,000-word lecture notes streaming live, with inline SVG illustrations auto-embedded in every section, AI diagrams, and PDF export — for any subject from primary school to PhD.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <button
              onClick={() => { if (!user) { setSelectedPlan("Free"); setAuthTab("signup"); setPage("login"); } else { setPage("generate"); } }}
              style={{ background: "#C8401A", color: "#fff", border: "none", borderRadius: 12, padding: "15px 34px", fontSize: "1rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 28px #C8401A44" }}>
              {user ? "Generate Notes →" : "Get Started Free →"}
            </button>
            <button onClick={() => setShowPrice(true)} style={{ background: "none", border: "1px solid #ffffff25", color: "#ccc", borderRadius: 12, padding: "15px 26px", fontSize: ".97rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              View Plans
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            {["✓ 1 free generation", "✓ No credit card", "✓ 3,000+ words", "✓ Inline illustrations", "✓ PDF export"].map(t => (
              <span key={t} style={{ fontSize: ".77rem", color: "#6b7280" }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Floating note preview */}
        <div className="lf-fade-up" style={{ position: "relative", zIndex: 1, marginTop: "3.5rem", width: "min(700px,92vw)", marginInline: "auto" }}>
          <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", borderRadius: 18, overflow: "hidden", border: "1px solid #ffffff10", boxShadow: "0 32px 80px rgba(0,0,0,.6)" }}>
            <div style={{ background: "#111", padding: "11px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #1a1a1a" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["#FF5F57","#FEBC2E","#28C840"].map(c => <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }}/>)}
              </div>
              <div style={{ flex: 1, textAlign: "center", fontSize: ".7rem", color: "#444" }}>lectureforge.ng — Photosynthesis · High School</div>
            </div>
            <div style={{ padding: "1.25rem 1.75rem", textAlign: "left" }}>
              <div style={{ background: "linear-gradient(135deg,#0D0D0D,#1a2744)", borderRadius: 10, padding: "1rem 1.25rem", marginBottom: ".9rem" }}>
                <div style={{ fontSize: ".62rem", color: "#D4A847", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".3rem" }}>LectureForge AI · Lecture Notes</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", fontWeight: 900, color: "#fff", marginBottom: ".45rem" }}>Photosynthesis & Cellular Energy</div>
                <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                  {["🌱 High School","⏱ 1 hour","📐 Full Notes"].map(t => (
                    <span key={t} style={{ fontSize: ".62rem", background: "#ffffff12", border: "1px solid #ffffff1a", borderRadius: 20, padding: "2px 9px", color: "#bbb" }}>{t}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".6rem" }}>
                {[
                  { label: "🎯 Learning Objectives", col: "#2D7A4F", bg: "#F0FBF4", txt: "5 measurable objectives using Bloom's verbs..." },
                  { label: "📖 Introduction", col: "#2563EB", bg: "#EEF4FF", txt: "Plants are nature's solar panels. Every bite of food..." },
                  { label: "📚 Section 1 — Light Reactions", col: "#C8401A", bg: "#FFF5F5", txt: "Chlorophyll absorbs light energy and converts it..." },
                  { label: "📐 Illustration", col: "#D97706", bg: "#FFF8EE", txt: "Chloroplast cross-section with labelled thylakoids..." },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderLeft: "3px solid " + s.col, borderRadius: 7, padding: ".55rem .7rem" }}>
                    <div style={{ fontSize: ".65rem", fontWeight: 700, color: s.col, marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: ".62rem", color: "#6b7280", lineHeight: 1.5 }}>{s.txt}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: ".75rem", height: 3, borderRadius: 3, background: "linear-gradient(90deg,#C8401A,#D4A847,#C8401A)", backgroundSize: "200% 100%" }}/>
            </div>
          </div>
          <div style={{ position: "absolute", top: 28, right: "clamp(-8px,-2vw,-16px)", background: "#2D7A4F", color: "#fff", borderRadius: 20, padding: "7px 14px", fontSize: ".7rem", fontWeight: 700, boxShadow: "0 6px 20px rgba(45,122,79,.45)", border: "2px solid #fff" }}>✓ Illustrations ready</div>
          <div style={{ position: "absolute", bottom: 36, left: "clamp(-8px,-2vw,-16px)", background: "#7C3AED", color: "#fff", borderRadius: 20, padding: "7px 14px", fontSize: ".7rem", fontWeight: 700, boxShadow: "0 6px 20px rgba(124,58,237,.45)", border: "2px solid #fff" }}>📊 Diagrams added</div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div style={{ background: "#0D0D0D", padding: ".9rem 1.25rem", display: "flex", justifyContent: "center", gap: "clamp(1rem,3vw,2.5rem)", flexWrap: "wrap", borderBottom: "1px solid #1a1a1a" }}>
        {[["8,400+","Notes Generated"],["6","Academic Levels"],["8","Diagram Types"],["Auto","Illustrations"],["₦3,500","Plans from"]].map(([v,l]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", fontWeight: 900, color: "#D4A847" }}>{v}</div>
            <div style={{ fontSize: ".68rem", color: "#555", textTransform: "uppercase", letterSpacing: ".05em", marginTop: 1 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* ── SCROLLING TOPICS ── */}
      <div style={{ background: "#0D0D0D", padding: ".65rem 0", overflow: "hidden", borderBottom: "1px solid #111" }}>
        <div style={{ display: "flex", gap: "2rem", animation: "marquee 22s linear infinite", whiteSpace: "nowrap", width: "max-content" }}>
          {[
            {s:"Photosynthesis",l:"Middle School",t:"Biology",c:"#2D7A4F"},
            {s:"The French Revolution",l:"High School",t:"History",c:"#C8401A"},
            {s:"Calculus Integration",l:"Undergraduate",t:"Maths",c:"#2563EB"},
            {s:"Quantum Mechanics",l:"PhD Research",t:"Physics",c:"#7C3AED"},
            {s:"Supply & Demand",l:"Undergraduate",t:"Economics",c:"#D97706"},
            {s:"Cell Division",l:"High School",t:"Biology",c:"#2D7A4F"},
            {s:"Shakespeare's Macbeth",l:"High School",t:"Literature",c:"#C8401A"},
            {s:"Artificial Intelligence",l:"Postgraduate",t:"Computing",c:"#2563EB"},
            ...[ // repeat for seamless loop
            {s:"Photosynthesis",l:"Middle School",t:"Biology",c:"#2D7A4F"},
            {s:"The French Revolution",l:"High School",t:"History",c:"#C8401A"},
            {s:"Calculus Integration",l:"Undergraduate",t:"Maths",c:"#2563EB"},
            {s:"Quantum Mechanics",l:"PhD Research",t:"Physics",c:"#7C3AED"},
            {s:"Supply & Demand",l:"Undergraduate",t:"Economics",c:"#D97706"},
            {s:"Cell Division",l:"High School",t:"Biology",c:"#2D7A4F"},
            ]
          ].map((n, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: ".55rem", flexShrink: 0 }}>
              <span style={{ fontSize: ".68rem", background: n.c+"20", color: n.c, border: "1px solid "+n.c+"44", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>{n.t}</span>
              <span style={{ fontSize: ".76rem", color: "#555" }}>{n.s}</span>
              <span style={{ color: "#222", fontSize: ".7rem" }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "clamp(2rem,4vw,3.5rem) clamp(1rem,3vw,1.5rem)" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: ".73rem", color: "#C8401A", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: ".6rem" }}>Everything included</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.7rem,4vw,2.6rem)", fontWeight: 900, marginBottom: ".6rem" }}>Everything a teacher needs</h2>
          <p style={{ color: "#6b7280", maxWidth: 460, marginInline: "auto", lineHeight: 1.8, fontSize: ".9rem" }}>Every plan — including free — includes illustrations, diagrams and PDF. Only generation count differs.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          {[
            { icon: "📐", t: "Inline Illustrations", d: "SVG illustrations auto-generated and embedded in each section — biology cells, chemistry bonds, historical maps, graphs.", col: "#D97706" },
            { icon: "📊", t: "AI Visual Diagrams", d: "8 types: concept maps, timelines, cycles, hierarchies, Venn diagrams — all specific to your topic.", col: "#7C3AED" },
            { icon: "🎓", t: "All Academic Levels", d: "Primary school to PhD. Vocabulary, depth and examples auto-calibrated for each level automatically.", col: "#2D7A4F" },
            { icon: "✍️", t: "Streams Live", d: "Notes appear word-by-word as Claude writes — see your notes build in real time.", col: "#2563EB" },
            { icon: "📄", t: "PDF Export", d: "Styled A4 PDF with cover page, all sections and embedded illustrations — ready to print.", col: "#C8401A" },
            { icon: "📋", t: "Complete Structure", d: "Header, Objectives, Intro, 4 Body Sections, Key Concepts, Worked Examples, Conclusion, Resources.", col: "#3D4A5C" },
          ].map(f => (
            <div key={f.t} className="lf-card-hover" style={{ background: "#fff", border: "1px solid #D8D2C8", borderTop: "3px solid "+f.col, borderRadius: 14, padding: "1.35rem" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: ".6rem" }}>{f.icon}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, marginBottom: ".35rem", fontSize: ".97rem" }}>{f.t}</div>
              <div style={{ fontSize: ".81rem", color: "#6b7280", lineHeight: 1.72 }}>{f.d}</div>
            </div>
          ))}
        </div>

        {/* ── HOW IT WORKS ── */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: ".73rem", color: "#C8401A", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: ".6rem" }}>Simple process</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.7rem,4vw,2.4rem)", fontWeight: 900 }}>Ready in 4 steps</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 0, marginBottom: "3rem" }}>
          {[
            { n: "01", t: "Enter your topic", d: "Type any subject, pick your academic level, duration and note format." },
            { n: "02", t: "Claude writes live", d: "Watch your 3,000-word notes stream section by section in real time." },
            { n: "03", t: "Illustrations appear", d: "SVG illustrations generate and embed automatically inside each section." },
            { n: "04", t: "Export or teach", d: "Copy text, export a styled PDF, or add extra diagrams with one click." },
          ].map((s, i) => (
            <div key={s.n} style={{ textAlign: "center", padding: "1.25rem .85rem", position: "relative" }}>
              {i < 3 && <div style={{ position: "absolute", top: "2.2rem", right: 0, width: "50%", height: 2, background: "linear-gradient(90deg,#C8401A,#EDE8DF)" }}/>}
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#C8401A,#D4A847)", display: "flex", alignItems: "center", justifyContent: "center", marginInline: "auto", marginBottom: ".85rem", position: "relative", zIndex: 1, boxShadow: "0 5px 18px #C8401A30" }}>
                <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, color: "#fff", fontSize: ".9rem" }}>{s.n}</span>
              </div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: ".92rem", marginBottom: ".35rem" }}>{s.t}</div>
              <div style={{ fontSize: ".79rem", color: "#6b7280", lineHeight: 1.7 }}>{s.d}</div>
            </div>
          ))}
        </div>

        {/* ── RECENT ── */}
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.25rem", marginBottom: ".85rem" }}>Recent Generations</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: ".6rem", marginBottom: "2.5rem" }}>
          {hist.slice(0, 3).map((h, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #D8D2C8", borderRadius: 12, padding: ".9rem 1.15rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: ".5rem" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: ".92rem" }}>{h.sub}</div>
                <div style={{ fontSize: ".76rem", color: "#8A8F9A", marginTop: 2 }}>{h.lv} · {h.dt}</div>
              </div>
              <span style={{ fontSize: ".72rem", fontWeight: 700, background: "#C8401A18", color: "#C8401A", border: "1px solid #C8401A35", borderRadius: 20, padding: "3px 11px" }}>{h.lv}</span>
            </div>
          ))}
        </div>

        {/* ── CTA STRIP ── */}
        <div style={{ background: "linear-gradient(135deg,#0D0D0D,#1a2744)", borderRadius: 18, padding: "2.5rem 2rem", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.5rem,3.5vw,2.2rem)", fontWeight: 900, color: "#fff", marginBottom: ".6rem" }}>Start generating better notes today.</h2>
          <p style={{ color: "#9ca3af", marginBottom: "1.5rem", fontSize: ".9rem" }}>1 free generation — full access. No credit card required.</p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => { if (!user) { setSelectedPlan("Free"); setAuthTab("signup"); setPage("login"); } else { setPage("generate"); } }} style={{ background: "#C8401A", color: "#fff", border: "none", borderRadius: 11, padding: "13px 30px", fontSize: ".97rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 24px #C8401A44" }}>
              {user ? "Generate Notes →" : "Try Free Now →"}
            </button>
            <button onClick={() => setShowPrice(true)} style={{ background: "none", border: "1px solid #ffffff30", color: "#ccc", borderRadius: 11, padding: "13px 22px", fontSize: ".9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>See Plans</button>
          </div>
        </div>
      </div>

      {showAdmin && <AdminPanel />}
      {showPrice && <PricingModal />}
    </div>
  );

  // ── LOGIN/SIGNUP ──────────────────────────────────────────────────────────
  if (page === "login") {
    const tabS = (active) => ({ flex: 1, padding: "10px", border: "none", background: active ? "#C8401A" : "transparent", color: active ? "#fff" : "#8A8F9A", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: ".88rem", borderRadius: active ? 9 : 0, transition: "all .15s" });
    return (
      <div style={{ minHeight: "100vh", background: "#F7F4EF", fontFamily: "'DM Sans',sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;600;700&display=swap');`}</style>
        <Nav />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 58px)", padding: "2rem" }}>
          <div style={CARD({ width: "min(420px,100%)", padding: "clamp(1.25rem,5vw,2.25rem)", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,.1)" })}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", fontWeight: 900 }}>
                <span style={{ color: "#D4A847" }}>L</span>ecture<span style={{ color: "#C8401A" }}>F</span>orge
              </div>
              <p style={{ color: "#8A8F9A", fontSize: ".82rem", marginTop: 4 }}>AI-Powered Lecture Note Generator</p>
            </div>
            <div style={{ display: "flex", background: "#EDE8DF", borderRadius: 11, padding: 4, marginBottom: "1.5rem" }}>
              <button onClick={() => { setAuthTab("login"); setLoginErr(""); }} style={tabS(authTab === "login")}>Sign In</button>
              <button onClick={() => { setAuthTab("signup"); setLoginErr(""); }} style={tabS(authTab === "signup")}>Sign Up</button>
            </div>
            {authTab === "login" && (
              <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
                <div><label style={{ fontSize: ".76rem", fontWeight: 700, display: "block", marginBottom: 4, color: "#3D4A5C" }}>Email</label><input type="text" placeholder="you@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} style={INP} /></div>
                <div><label style={{ fontSize: ".76rem", fontWeight: 700, display: "block", marginBottom: 4, color: "#3D4A5C" }}>Password</label><input type="password" placeholder="••••••••" value={pass} onChange={(e) => setPass(e.target.value)} style={INP} /></div>
                {loginErr && <p style={{ color: "#C8401A", fontSize: ".8rem", background: "#C8401A0f", padding: "8px 12px", borderRadius: 8 }}>{loginErr}</p>}
                <button onClick={doLogin} style={BTN("#C8401A", { padding: "12px", fontSize: ".93rem", borderRadius: 11, width: "100%", marginTop: 4 })}>Sign In</button>
                <div style={{ background: "#F7F4EF", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: ".72rem", color: "#8A8F9A", lineHeight: 1.7, textAlign: "center" }}>Demo: any email + 6+ char password<br /><span style={{ color: "#D4A847" }}>Admin:</span> admin@lectureforge.ai / Admin@2026</p>
                </div>
              </div>
            )}
            {authTab === "signup" && (
              <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>

                {/* Plan indicator at top of signup */}
                <div style={{ background: selectedPlan === "Free" ? "#F7F4EF" : "#0D0D0D", border: "2px solid " + ({"Free":"#D8D2C8","Starter":"#2563EB","Basic":"#C8401A","Pro":"#3D4A5C","Institution":"#7C3AED"}[selectedPlan] || "#D8D2C8"), borderRadius: 10, padding: ".75rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: ".67rem", color: selectedPlan === "Free" ? "#8A8F9A" : "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>Signing up for</div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: "1rem", color: selectedPlan === "Free" ? "#0D0D0D" : "#fff" }}>
                      {selectedPlan} &nbsp;
                      <span style={{ fontSize: ".78rem", fontWeight: 400, color: selectedPlan === "Free" ? "#8A8F9A" : "#aaa" }}>
                        {({"Free":"₦0/forever","Starter":"₦3,500/mo","Basic":"₦8,000/mo","Pro":"₦18,000/mo","Institution":"₦45,000/mo"})[selectedPlan] || ""}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setShowPrice(true)} style={{ background: "none", border: "1px solid " + (selectedPlan === "Free" ? "#D8D2C8" : "#ffffff33"), color: selectedPlan === "Free" ? "#8A8F9A" : "#ccc", borderRadius: 8, padding: "5px 11px", cursor: "pointer", fontFamily: "inherit", fontSize: ".74rem", fontWeight: 600 }}>
                    Change
                  </button>
                </div>

                <div><label style={{ fontSize: ".76rem", fontWeight: 700, display: "block", marginBottom: 4, color: "#3D4A5C" }}>Full Name</label><input type="text" placeholder="Dr. Jane Smith" value={sName} onChange={(e) => setSName(e.target.value)} style={INP} /></div>
                <div><label style={{ fontSize: ".76rem", fontWeight: 700, display: "block", marginBottom: 4, color: "#3D4A5C" }}>Email</label><input type="text" placeholder="you@school.edu" value={sEmail} onChange={(e) => setSEmail(e.target.value)} style={INP} /></div>
                <div><label style={{ fontSize: ".76rem", fontWeight: 700, display: "block", marginBottom: 4, color: "#3D4A5C" }}>Password</label><input type="password" placeholder="Min. 6 characters" value={sPass} onChange={(e) => setSPass(e.target.value)} style={INP} /></div>
                <div><label style={{ fontSize: ".76rem", fontWeight: 700, display: "block", marginBottom: 4, color: "#3D4A5C" }}>Confirm Password</label><input type="password" placeholder="Re-enter password" value={sPass2} onChange={(e) => setSPass2(e.target.value)} style={INP} /></div>
                {loginErr && <p style={{ color: "#C8401A", fontSize: ".8rem", background: "#C8401A0f", padding: "8px 12px", borderRadius: 8 }}>{loginErr}</p>}
                <button onClick={doSignup} style={BTN(
                  selectedPlan === "Free" ? "#2D7A4F" :
                  ({"Starter":"#2563EB","Basic":"#C8401A","Pro":"#3D4A5C","Institution":"#7C3AED"})[selectedPlan] || "#2D7A4F",
                  { padding: "12px", fontSize: ".93rem", borderRadius: 11, width: "100%", marginTop: 4 }
                )}>
                  {selectedPlan === "Free" ? "Create Free Account" : "Create Account & Continue to Payment →"}
                </button>
                <p style={{ fontSize: ".72rem", color: "#8A8F9A", textAlign: "center" }}>
                  {selectedPlan === "Free"
                    ? "Free plan: 1 full-access generation. Upgrade to get more."
                    : ({"Starter":"15","Basic":"40","Pro":"100","Institution":"300"})[selectedPlan] + " generations/month. Paystack payment after account creation."}
                </p>
              </div>
            )}
            <button onClick={() => setPage("home")} style={{ background: "none", border: "none", color: "#8A8F9A", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem", marginTop: "1rem", display: "block", marginLeft: "auto", marginRight: "auto" }}>← Back to home</button>
          </div>
        </div>
        {showPrice && <PricingModal />}
      </div>
    );
  }

  // ── GENERATE ─────────────────────────────────────────────────────────────
  if (page === "generate") return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;600;700&display=swap');`}</style>
      <Nav />
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "1.75rem clamp(.85rem,3vw,1.5rem)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <button onClick={() => setPage("home")} style={{ background: "none", border: "1px solid #D8D2C8", color: "#8A8F9A", cursor: "pointer", padding: "6px 12px", borderRadius: 8, fontFamily: "inherit", fontSize: ".8rem" }}>← Back</button>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.45rem", fontWeight: 900 }}>Generate Lecture Notes</h1>
        </div>

        {user && (
          <div style={{ background: "#D4A84714", border: "1px solid #D4A84733", borderRadius: 10, padding: ".75rem 1rem", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: ".5rem" }}>
            <span style={{ fontSize: ".82rem", color: "#3D4A5C" }}>
              <strong>{used}</strong>/{limit === 99999 ? "∞" : limit} generations used · <strong>{plan}</strong> plan {plan === "Free" ? "· Full access" : ""}
            </span>
            {plan !== "Pro" && plan !== "Institution" && <button onClick={() => setShowPrice(true)} style={BTN("#D4A847", { padding: "5px 12px", fontSize: ".76rem", borderRadius: 8 })}>Upgrade</button>}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}>
          <div>
            <label style={{ fontWeight: 700, fontSize: ".84rem", display: "block", marginBottom: 6, color: "#3D4A5C" }}>Subject / Topic *</label>
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Photosynthesis, The French Revolution, Calculus Integration…" style={{ ...INP, fontSize: ".95rem", padding: "13px 14px" }} />
          </div>

          <div>
            <label style={{ fontWeight: 700, fontSize: ".84rem", display: "block", marginBottom: 8, color: "#3D4A5C" }}>Academic Level</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: ".45rem" }}>
              {LEVELS.map((l) => {
                const active = form.level === l.id;
                return (
                  <button key={l.id} onClick={() => setForm({ ...form, level: l.id })} style={{ border: active ? "2px solid #C8401A" : "1px solid #D8D2C8", background: active ? "#C8401A0e" : "#FDFBF8", borderRadius: 10, padding: ".6rem .7rem", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: ".15s" }}>
                    <div style={{ fontSize: ".95rem", marginBottom: 2 }}>{l.icon}</div>
                    <div style={{ fontSize: ".8rem", fontWeight: 700, color: active ? "#C8401A" : "#0D0D0D" }}>{l.label}</div>
                    <div style={{ fontSize: ".68rem", color: "#8A8F9A" }}>{l.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: ".85rem" }}>
            <div>
              <label style={{ fontWeight: 700, fontSize: ".84rem", display: "block", marginBottom: 6, color: "#3D4A5C" }}>Duration</label>
              <select value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} style={INP}>
                {DURATIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: ".84rem", display: "block", marginBottom: 6, color: "#3D4A5C" }}>Format</label>
              <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} style={INP}>
                {FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontWeight: 700, fontSize: ".84rem", display: "block", marginBottom: 6, color: "#3D4A5C" }}>Teaching Style</label>
            <input value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} placeholder="e.g. Socratic, problem-based, visual, interactive…" style={INP} />
          </div>

          <div>
            <label style={{ fontWeight: 700, fontSize: ".84rem", display: "block", marginBottom: 6, color: "#3D4A5C" }}>Learning Objectives <span style={{ fontWeight: 400, color: "#8A8F9A" }}>(optional)</span></label>
            <textarea value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} placeholder="What should students know or do by the end?" rows={3} style={{ ...INP, resize: "vertical", lineHeight: 1.7 }} />
          </div>

          {genErr && <div style={{ color: "#C8401A", fontSize: ".84rem", background: "#C8401A0d", borderRadius: 9, padding: ".7rem 1rem", border: "1px solid #C8401A22" }}>{genErr}</div>}

          <button onClick={doGenerate} style={BTN("#C8401A", { padding: "14px", fontSize: ".97rem", borderRadius: 12, width: "100%", boxShadow: "0 6px 20px #C8401A30" })}>
            ✨ Generate Complete Lecture Notes
          </button>
          <p style={{ fontSize: ".76rem", color: "#8A8F9A", textAlign: "center" }}>Generates ~2,500+ words with all sections. Takes 15–30 seconds.</p>
        </div>
      </div>
      {showPrice && <PricingModal />}
    </div>
  );

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (page === "result") return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;600;700&display=swap');`}</style>
      <Nav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.75rem clamp(.85rem,3vw,1.5rem)" }}>
        {/* Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: ".65rem" }}>
          <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => setPage("generate")} style={{ background: "none", border: "1px solid #D8D2C8", color: "#8A8F9A", cursor: "pointer", padding: "6px 12px", borderRadius: 8, fontFamily: "inherit", fontSize: ".79rem" }}>← New Note</button>
            {[LEVELS.find((l) => l.id === form.level)?.label, form.duration].filter(Boolean).map((t) => (
              <span key={t} style={{ fontSize: ".72rem", fontWeight: 700, background: "#3D4A5C18", color: "#3D4A5C", border: "1px solid #3D4A5C33", borderRadius: 20, padding: "3px 10px" }}>{t}</span>
            ))}
            {diagrams.length > 0 && <span style={{ fontSize: ".72rem", fontWeight: 700, background: "#7C3AED18", color: "#7C3AED", border: "1px solid #7C3AED33", borderRadius: 20, padding: "3px 10px" }}>{diagrams.length} diagram{diagrams.length !== 1 ? "s" : ""}</span>}
            {illustrations.length > 0 && <span style={{ fontSize: ".72rem", fontWeight: 700, background: C.gold+"18", color: "#B45309", border: "1px solid "+C.gold+"44", borderRadius: 20, padding: "3px 10px" }}>{illustrations.length} illustration{illustrations.length !== 1 ? "s" : ""}</span>}
            {modelInfo && <span style={{ fontSize: ".72rem", fontWeight: 700, background: "#0D0D0D", color: "#D4A847", borderRadius: 20, padding: "3px 10px", border: "1px solid #333" }}>{modelInfo.badge} · {modelInfo.name}</span>}
          </div>
          {result && (
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              <button onClick={doCopy} style={BTN(copied ? "#2D7A4F" : "#3D4A5C", { padding: "8px 16px" })}>{copied ? "✓ Copied!" : "Copy Text"}</button>
              <button onClick={() => exportPDF(form, result, diagrams)} style={BTN("#2D7A4F", { padding: "8px 16px" })}>📄 Export PDF</button>
            </div>
          )}
        </div>

        {/* Note card */}
        <div style={CARD({ padding: 0, overflow: "hidden" })}>
          {loading ? (
            <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1.25rem" }}>✨</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700, color: "#0D0D0D", marginBottom: ".5rem" }}>Writing your complete lecture notes…</div>
              <div style={{ fontSize: ".84rem", color: "#8A8F9A", marginBottom: "1.5rem" }}>Generating all sections for "{form.subject}"<br />This takes 15–30 seconds for thorough notes.</div>
              <div style={{ display: "flex", justifyContent: "center", gap: ".4rem", flexWrap: "wrap" }}>
                {["Header", "Objectives", "Introduction", "Body Sections", "Key Concepts", "Examples", "Conclusion", "Resources"].map((s, i) => (
                  <span key={s} style={{ fontSize: ".68rem", background: "#C8401A14", color: "#C8401A", borderRadius: 10, padding: "2px 8px", animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite alternate` }}>{s}</span>
                ))}
              </div>
              <style>{`@keyframes pulse{from{opacity:.3}to{opacity:1}}`}</style>
            </div>
          ) : genErr ? (
            <div style={{ color: "#C8401A", textAlign: "center", padding: "3rem", fontSize: ".9rem" }}>{genErr}</div>
          ) : result ? (
            <NoteDocument form={form} text={result} diagrams={diagrams} illustrations={illustrations} />
          ) : null}
        </div>

        {/* Illustration loading */}
        {illLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".9rem 1.1rem", background: "#FFF8EE", borderRadius: 11, marginTop: ".9rem", border: "1px solid #D9770633" }}>
            <span>📐</span>
            <span style={{ fontSize: ".83rem", color: "#D97706", fontWeight: 600 }}>Generating inline illustrations for each section…</span>
          </div>
        )}
        {/* Diagram loading */}
        {diagLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".9rem 1.1rem", background: "#F8F4FF", borderRadius: 11, marginTop: ".9rem", border: "1px solid #7C3AED33" }}>
            <span>⏳</span>
            <span style={{ fontSize: ".83rem", color: "#7C3AED", fontWeight: 600 }}>Generating your diagrams…</span>
          </div>
        )}

        {/* Diagram picker */}
        {result && !loading && (
          <div style={CARD({ marginTop: "1rem", padding: "1.1rem 1.25rem" })}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: ".9rem", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: ".9rem" }}>📊 Add Visual Diagrams</span>
              <span style={{ fontSize: ".74rem", color: "#8A8F9A", marginLeft: "auto" }}>Select up to 3 — embeds inside the note</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: ".4rem", marginBottom: ".85rem" }}>
              {[
                { id: "concept", label: "Concept Map", icon: "🔵" },
                { id: "timeline", label: "Timeline", icon: "⏳" },
                { id: "cycle", label: "Cycle", icon: "🔄" },
                { id: "hierarchy", label: "Hierarchy", icon: "🌳" },
                { id: "flow", label: "Process Flow", icon: "➡️" },
                { id: "mindmap", label: "Mind Map", icon: "🧠" },
                { id: "venn", label: "Venn Diagram", icon: "⭕" },
                { id: "compare", label: "Comparison", icon: "⚖️" },
              ].map((d) => {
                const on = selDiag.includes(d.id);
                return (
                  <button key={d.id} onClick={() => toggleDiag(d.id)} style={{ border: on ? "2px solid #C8401A" : "1px solid #D8D2C8", background: on ? "#C8401A0f" : "#FDFBF8", borderRadius: 10, padding: ".55rem .65rem", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: ".15s" }}>
                    <div style={{ fontSize: ".95rem", marginBottom: 2 }}>{d.icon}</div>
                    <div style={{ fontSize: ".77rem", fontWeight: 700, color: on ? "#C8401A" : "#0D0D0D" }}>{d.label}</div>
                  </button>
                );
              })}
            </div>
            <button onClick={doGenDiagrams} disabled={selDiag.length === 0 || diagLoading} style={BTN("#3D4A5C", { opacity: selDiag.length === 0 || diagLoading ? .45 : 1, borderRadius: 10 })}>
              {diagLoading ? "Generating…" : `Generate ${selDiag.length > 0 ? selDiag.length + " " : ""}Diagram${selDiag.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        )}

        {result && !loading && (
          <div style={{ display: "flex", gap: ".65rem", marginTop: ".9rem", flexWrap: "wrap" }}>
            <button onClick={() => setPage("generate")} style={BTN("#3D4A5C", { borderRadius: 10 })}>Generate Another</button>
            {plan === "Free" && <button onClick={() => setShowPrice(true)} style={{ background: "none", border: "1px solid #D4A847", color: "#D4A847", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontFamily: "inherit", fontSize: ".84rem", fontWeight: 700 }}>Upgrade for Unlimited →</button>}
          </div>
        )}
      </div>
      {showPrice && <PricingModal />}
    </div>
  );

  // ── HISTORY ───────────────────────────────────────────────────────────────
  if (page === "history") return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;600;700&display=swap');`}</style>
      <Nav />
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "1.75rem clamp(.85rem,3vw,1.5rem)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.4rem" }}>
          <button onClick={() => setPage("home")} style={{ background: "none", border: "1px solid #D8D2C8", color: "#8A8F9A", cursor: "pointer", padding: "6px 12px", borderRadius: 8, fontFamily: "inherit", fontSize: ".8rem" }}>← Back</button>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.4rem" }}>Your Notes</h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
          {hist.map((h, i) => (
            <div key={i} style={CARD({ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: ".5rem", padding: ".9rem 1.15rem" })}>
              <div>
                <div style={{ fontWeight: 600, fontSize: ".92rem" }}>{h.sub}</div>
                <div style={{ fontSize: ".75rem", color: "#8A8F9A", marginTop: 2 }}>{h.lv} · {h.dt}</div>
              </div>
              <span style={{ fontSize: ".72rem", fontWeight: 700, background: "#C8401A18", color: "#C8401A", border: "1px solid #C8401A35", borderRadius: 20, padding: "3px 11px" }}>{h.lv}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── ADMIN PANEL ──────────────────────────────────────────────────────────
  function AdminPanel() {
    return (
      <div onClick={() => setShowAdmin(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 999, display: "flex", justifyContent: "flex-end" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "min(680px,100vw)", height: "100vh", background: "#F7F4EF", overflowY: "auto", boxShadow: "-8px 0 40px rgba(0,0,0,.25)", fontFamily: "'DM Sans',sans-serif" }}>
          <div style={{ background: "#0D0D0D", color: "#fff", padding: "1.1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 1 }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700 }}>⚙ Admin Console</div>
              <div style={{ fontSize: ".72rem", color: "#aaa" }}>LectureForge Management</div>
            </div>
            <button onClick={() => setShowAdmin(false)} style={{ background: "#fff2", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: "1rem" }}>✕</button>
          </div>
          <div style={{ padding: "1.5rem" }}>
            {/* Stats */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: ".9rem" }}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700 }}>Platform Overview</h3>
              <span style={{ fontSize: ".68rem", color: "#8A8F9A", background: "#EDE8DF", border: "1px solid #D8D2C8", borderRadius: 10, padding: "2px 8px" }}>Read-only</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: ".65rem", marginBottom: "1.5rem" }}>
              {[["Total Users", "1,247", "#C8401A"], ["Basic Plan", "312", "#D4A847"], ["Pro Plan", "89", "#3D4A5C"], ["Notes Made", "8,432", "#2D7A4F"], ["Revenue MRR", "₦1.0M", "#7C3AED"]].map(([l, v, c]) => (
                <div key={l} style={CARD({ borderTop: "3px solid " + c, padding: ".85rem 1rem" })}>
                  <div style={{ fontSize: ".68rem", color: "#8A8F9A", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 700 }}>{l}</div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.35rem", fontWeight: 700, marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </div>
            {/* Pricing read-only */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: ".75rem" }}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700 }}>Pricing Plans</h3>
              <span style={{ fontSize: ".68rem", color: "#8A8F9A", background: "#EDE8DF", border: "1px solid #D8D2C8", borderRadius: 10, padding: "2px 8px" }}>Read-only</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".55rem", marginBottom: "1.75rem" }}>
              {[
                { n: "Free",        p: "₦0",        col: "#8A8F9A", f: "1 generation · Full access trial" },
                { n: "Starter",     p: "₦3,500/mo", col: "#2563EB", f: "15 notes/mo · API ~₦2,400 · Profit ~₦1,100" },
                { n: "Basic",       p: "₦8,000/mo", col: "#C8401A", f: "40 notes/mo · API ~₦6,400 · Profit ~₦1,600" },
                { n: "Pro",         p: "₦18,000/mo",col: "#3D4A5C", f: "100 notes/mo · API ~₦16,000 · Profit ~₦2,000" },
                { n: "Institution", p: "₦45,000/mo",col: "#7C3AED", f: "300 notes/mo · Custom enterprise terms" },
              ].map((p) => (
                <div key={p.n} style={CARD({ display: "flex", alignItems: "center", gap: "1rem", padding: ".8rem 1.05rem", flexWrap: "wrap" })}>
                  <span style={{ fontSize: ".72rem", fontWeight: 700, background: ({ Free: "#8A8F9A", Basic: "#C8401A", Pro: "#3D4A5C" }[p.n] || "#8A8F9A") + "18", color: { Free: "#8A8F9A", Basic: "#C8401A", Pro: "#3D4A5C" }[p.n] || "#8A8F9A", border: "1px solid " + ({ Free: "#8A8F9A", Basic: "#C8401A", Pro: "#3D4A5C" }[p.n] || "#8A8F9A") + "35", borderRadius: 20, padding: "2px 10px" }}>{p.n}</span>
                  <span style={{ fontWeight: 700, color: "#C8401A" }}>{p.p}</span>
                  <span style={{ fontSize: ".8rem", color: "#8A8F9A" }}>{p.f}</span>
                </div>
              ))}
            </div>
            {/* User management */}
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, marginBottom: ".35rem" }}>User Management</h3>
            <p style={{ fontSize: ".8rem", color: "#8A8F9A", marginBottom: "1rem" }}>Add users or change their plan instantly.</p>
            <div style={{ background: "#EDE8DF", border: "1px solid #D8D2C8", borderRadius: 12, padding: "1.1rem 1.2rem", marginBottom: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: ".87rem", marginBottom: ".9rem" }}>➕ Add User to Plan</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: ".65rem", marginBottom: ".65rem" }}>
                <div><label style={{ fontSize: ".74rem", fontWeight: 700, display: "block", marginBottom: 4 }}>Full Name</label><input type="text" placeholder="e.g. Amaka Obi" value={nuName} onChange={(e) => setNuName(e.target.value)} style={INP} /></div>
                <div><label style={{ fontSize: ".74rem", fontWeight: 700, display: "block", marginBottom: 4 }}>Email</label><input type="text" placeholder="user@school.ng" value={nuEmail} onChange={(e) => setNuEmail(e.target.value)} style={INP} /></div>
              </div>
              <div style={{ marginBottom: ".8rem" }}>
                <label style={{ fontSize: ".74rem", fontWeight: 700, display: "block", marginBottom: 5 }}>Assign Plan</label>
                <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                  {["Free", "Basic", "Pro"].map((p) => {
                    const col = { Free: "#8A8F9A", Basic: "#C8401A", Pro: "#3D4A5C" }[p];
                    const active = nuPlan === p;
                    return <button key={p} onClick={() => setNuPlan(p)} style={{ border: active ? "2px solid " + col : "1px solid #D8D2C8", background: active ? col + "18" : "#fff", color: active ? col : "#3D4A5C", borderRadius: 8, padding: "7px 15px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: ".83rem" }}>{p}</button>;
                  })}
                </div>
              </div>
              {addErr && <p style={{ color: "#C8401A", fontSize: ".79rem", marginBottom: ".5rem" }}>⚠ {addErr}</p>}
              {addOk && <p style={{ color: "#2D7A4F", fontSize: ".79rem", marginBottom: ".5rem", fontWeight: 700 }}>✓ {addOk}</p>}
              <button onClick={doAddUser} style={BTN("#2D7A4F", { borderRadius: 9 })}>Add User</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".55rem" }}>
              {aUsers.map((u) => (
                <div key={u.id} style={CARD({ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".65rem", padding: ".9rem 1.05rem" })}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: ".9rem" }}>{u.name}</div>
                    <div style={{ fontSize: ".74rem", color: "#8A8F9A", marginTop: 2 }}>{u.email} · {u.joined}</div>
                  </div>
                  <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                    {["Free", "Basic", "Pro"].map((p) => {
                      const col = { Free: "#8A8F9A", Basic: "#C8401A", Pro: "#3D4A5C" }[p];
                      const active = u.plan === p;
                      return <button key={p} onClick={() => changePlan(u.id, p)} style={{ border: active ? "2px solid " + col : "1px solid #D8D2C8", background: active ? col : "#fff", color: active ? "#fff" : "#8A8F9A", borderRadius: 7, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: ".76rem", transition: ".15s" }}>{p}</button>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PRICING MODAL ─────────────────────────────────────────────────────────
  function PricingModal() {
    const cp = user?.plan || "none";
    const plans = [
      {
        n: "Free", price: "₦0", per: "/forever", col: "#8A8F9A", badge: null,
        feats: ["1 generation · full access", "All 6 academic levels", "Gemini 2.0 Flash AI", "Inline Illustrations", "AI Diagrams (8 types)", "PDF Export"],
        cta: cp === "Free" ? "Current Plan" : "Try Free", dis: cp === "Free",
      },
      {
        n: "Starter", price: "₦3,500", per: "/month", col: "#2563EB", badge: "BEST VALUE",
        feats: ["15 generations/month", "Gemini 2.0 Flash AI", "Live streaming generation", "Note history", "Email support"],
        cta: cp === "Starter" ? "Current Plan" : "Get Starter", dis: cp === "Starter",
      },
      {
        n: "Basic", price: "₦8,000", per: "/month", col: "#C8401A", badge: "MOST POPULAR", hot: true,
        feats: ["40 generations/month", "⭐ Claude Sonnet AI (premium)", "Priority processing", "Saved notes library", "Chat support"],
        cta: cp === "Basic" ? "Current Plan" : "Get Basic", dis: cp === "Basic",
      },
      {
        n: "Pro", price: "₦18,000", per: "/month", col: "#3D4A5C", badge: null,
        feats: ["100 generations/month", "⭐ Claude Sonnet AI (premium)", "Fastest processing", "Team access (5 users)", "Priority support"],
        cta: cp === "Pro" ? "Current Plan" : "Get Pro", dis: cp === "Pro",
      },
      {
        n: "Institution", price: "₦45,000", per: "/month", col: "#7C3AED", badge: null,
        feats: ["300 generations/month", "⭐ Claude Sonnet AI (premium)", "Team of 20 users", "Admin analytics", "Dedicated manager"],
        cta: cp === "Institution" ? "Current Plan" : "Contact Us", dis: cp === "Institution",
      },
    ];
    return (
      <div onClick={() => setShowPrice(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: "#F7F4EF", borderRadius: 22, padding: "2.25rem", width: "min(860px,100%)", maxHeight: "92vh", overflowY: "auto", fontFamily: "'DM Sans',sans-serif" }}>
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", fontWeight: 900 }}>Choose Your Plan</h2>
            <p style={{ color: "#8A8F9A", marginTop: ".4rem", fontSize: ".86rem" }}>Free plan gives 1 full-access generation to try. Upgrade for more.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: ".85rem" }}>
            {plans.map((p) => (
              <div key={p.n} style={{ border: p.hot ? "2px solid " + p.col : "1px solid #D8D2C8", borderRadius: 16, padding: "1.5rem", background: p.hot ? p.col + "08" : "#FDFBF8", position: "relative" }}>
                {p.badge && <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: p.col, color: "#fff", borderRadius: 20, padding: "3px 14px", fontSize: ".68rem", fontWeight: 700, whiteSpace: "nowrap" }}>{p.badge}</div>}
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.15rem", fontWeight: 700, color: p.col }}>{p.n}</div>
                <div style={{ fontSize: "1.9rem", fontWeight: 900, margin: ".45rem 0", color: "#0D0D0D" }}>{p.price}<span style={{ fontSize: ".82rem", color: "#8A8F9A", fontWeight: 400 }}>{p.per}</span></div>
                <ul style={{ listStyle: "none", marginBottom: "1.15rem" }}>
                  {p.feats.map((f) => <li key={f} style={{ display: "flex", gap: ".45rem", alignItems: "flex-start", marginBottom: ".45rem", fontSize: ".83rem", color: "#3D4A5C" }}><span style={{ color: p.col, fontWeight: 700 }}>✓</span>{f}</li>)}
                </ul>
                <button
                  disabled={p.dis}
                  onClick={() => {
                    if (p.dis) return;
                    setShowPrice(false);
                    setSelectedPlan(p.n);
                    if (p.n === "Free") {
                      setAuthTab("signup"); setPage("login");
                    } else if (!user) {
                      setAuthTab("signup"); setPage("login");
                    } else if (p.n === "Institution") {
                      alert("Contact us at hello@lectureforge.ng for Institution setup.");
                    } else {
                      alert("Redirecting to Paystack for " + p.n + " plan.\nIntegrate: /api/payment → Paystack authorization_url");
                    }
                  }}
                  style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: p.dis ? "#EDE8DF" : p.col, color: p.dis ? "#8A8F9A" : "#fff", cursor: p.dis ? "default" : "pointer", fontWeight: 700, fontFamily: "inherit", fontSize: ".86rem" }}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
            <button onClick={() => setShowPrice(false)} style={{ background: "none", border: "none", color: "#8A8F9A", cursor: "pointer", fontFamily: "inherit", fontSize: ".84rem" }}>Maybe later</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
