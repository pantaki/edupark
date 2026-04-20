import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Support both old format {content, subject, grade, count} and new format {prompt}
    const prompt = body.prompt || buildLegacyPrompt(body);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const arrMatch = clean.match(/\[[\s\S]*\]/);
      const objMatch = clean.match(/\{[\s\S]*\}/);
      if (arrMatch) parsed = JSON.parse(arrMatch[0]);
      else if (objMatch) parsed = JSON.parse(objMatch[0]);
      else throw new Error("Invalid JSON from AI");
    }

    const raw = Array.isArray(parsed) ? parsed : (parsed.questions || []);
    const questions = raw.map((q: { question: string; options: string[]; correct: string }) => ({
      question: q.question,
      options: q.options,
      correct: q.correct,
    }));

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("Generate quiz error:", err);
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
  }
}

function buildLegacyPrompt(body: { content?: string; subject?: string; grade?: number; count?: number }) {
  const { content = "", subject = "math", grade = 3, count = 5 } = body;
  const subjectMap: Record<string, string> = {
    math: "Toán học", viet: "Tiếng Việt", eng: "Tiếng Anh", science: "Khoa học",
  };
  return `Bạn là giáo viên tiểu học Việt Nam. Tạo ${count} câu hỏi trắc nghiệm môn ${subjectMap[subject] || subject}, lớp ${grade}.
Nội dung: "${content.slice(0, 2000)}"
Trả về JSON array, KHÔNG markdown:
[{"question":"...","options":["A","B","C","D"],"correct":"A"}]`;
}