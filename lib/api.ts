// lib/api.ts
// Passes userPlan with every request so the backend can route to the right model:
//   Free + Starter  → Gemini 2.0 Flash  (cheap, fast, great quality)
//   Basic + Pro + Institution → Claude Sonnet (best quality for premium users)

export async function generateNotesStream(
  form: { subject: string; level: string; duration: string; format: string; style: string; objectives: string },
  userPlan: string,
  onChunk: (text: string) => void,
  onModelInfo: (info: { name: string; badge: string }) => void,
  onDone: () => void,
  onError: (err: string) => void
) {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ form, userPlan }),
    });

    if (!res.ok || !res.body) { onError("Generation failed. Please try again."); return; }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value, { stream: true }).split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") { onDone(); return; }
        try {
          const parsed = JSON.parse(data);
          if (parsed.text)      onChunk(parsed.text);
          if (parsed.modelInfo) onModelInfo(parsed.modelInfo);
          if (parsed.error)     { onError(parsed.error); return; }
        } catch {}
      }
    }
    onDone();
  } catch {
    onError("Connection error. Please check your internet and try again.");
  }
}

export async function generateDiagram(
  subject: string,
  level: string,
  dtype: string,
  userPlan: string
) {
  try {
    const res = await fetch("/api/diagram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, level, dtype, userPlan }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function generateIllustration(
  description: string,
  subject: string,
  level: string,
  userPlan: string
) {
  try {
    const res = await fetch("/api/illustration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, subject, level, userPlan }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}
