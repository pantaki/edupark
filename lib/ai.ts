export interface GeneratedQuestion {
  question: string;
  options: string[];
  correct: string;
}

export async function generateQuizWithAI(
  content: string,
  subject: string,
  grade: number,
  count: number = 5
): Promise<GeneratedQuestion[]> {
  const response = await fetch("/api/generate-quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, subject, grade, count }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate quiz");
  }

  const data = await response.json();
  return data.questions;
}
