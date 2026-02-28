import { NextRequest, NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';

let client: AzureOpenAI | null = null;
function getClient(): AzureOpenAI {
  if (!client) {
    client = new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21',
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o-mini'}`,
    });
  }
  return client;
}

const DIFFICULTY_MAP: Record<string, { bloom: string; instruction: string }> = {
  L1: { bloom: 'Recall / Remember', instruction: 'Ask straightforward recall questions testing basic facts, definitions, and terminology.' },
  L2: { bloom: 'Comprehension / Understand', instruction: 'Ask questions that test understanding of concepts -- explain, interpret, compare, or summarize.' },
  L3: { bloom: 'Application / Apply', instruction: 'Ask questions requiring the student to apply knowledge to new situations or solve practical problems.' },
  L4: { bloom: 'Analysis / Analyze', instruction: 'Ask questions that require breaking down information, comparing, finding patterns, or diagnosing situations.' },
  L5: { bloom: 'Synthesis & Evaluation', instruction: 'Ask questions requiring evaluation of trade-offs, designing solutions, or making justified decisions.' },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subject, difficulty, count = 5, previousQuestions = [] } = body as {
      subject: string;
      difficulty: string;
      count?: number;
      previousQuestions?: string[];
    };

    if (!subject || !difficulty) {
      return NextResponse.json({ error: 'subject and difficulty are required' }, { status: 400 });
    }

    const level = DIFFICULTY_MAP[difficulty] || DIFFICULTY_MAP['L2'];
    const subjectLabel = subject === 'math' ? 'Mathematics (algebra, calculus, probability, statistics, geometry)' : 'Artificial Intelligence and Machine Learning';

    const avoidBlock = previousQuestions.length > 0
      ? `\n\nIMPORTANT: The student has already seen these questions in this session. Do NOT repeat or closely paraphrase any of them:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

    const prompt = `You are an expert quiz generator for an adaptive learning platform.

Subject: ${subjectLabel}
Bloom's Taxonomy Level: ${level.bloom}
${level.instruction}

Generate exactly ${count} multiple-choice questions. Each question must have exactly 4 options (A, B, C, D) with exactly one correct answer.

For each question also provide:
- A short "misconception" string explaining the common mistake a student might make
- A short "reinforcementTip" string giving a helpful study tip${avoidBlock}

Return ONLY a valid JSON array (no markdown fences, no extra text):
[
  {
    "concept": "short concept name",
    "question": "the question text",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correctOption": "A",
    "misconception": "...",
    "reinforcementTip": "..."
  }
]`;

    const response = await getClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 2500,
    });

    const raw = response.choices[0]?.message?.content || '[]';

    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const jsonStr = fenced?.[1]?.trim() || raw.trim();

    const arrStart = jsonStr.indexOf('[');
    const arrEnd = jsonStr.lastIndexOf(']');
    if (arrStart < 0 || arrEnd <= arrStart) {
      return NextResponse.json({ error: 'AI returned invalid format', questions: [] }, { status: 200 });
    }

    const parsed = JSON.parse(jsonStr.slice(arrStart, arrEnd + 1));
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'AI returned non-array', questions: [] }, { status: 200 });
    }

    interface RawQ {
      concept?: string;
      question?: string;
      options?: Record<string, string>;
      correctOption?: string;
      misconception?: string;
      reinforcementTip?: string;
    }

    const questions = (parsed as RawQ[])
      .filter((q) => q?.question && q?.options && q?.correctOption)
      .slice(0, count)
      .map((q, i) => ({
        id: `gen-${Date.now()}-${i}`,
        subject,
        difficulty,
        concept: q.concept || 'general',
        question: q.question,
        options: q.options,
        correctOption: q.correctOption,
        misconception: q.misconception || 'Review the concept carefully.',
        reinforcementTip: q.reinforcementTip || 'Practice similar problems to reinforce understanding.',
      }));

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error generating adaptive quiz questions:', error);
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 });
  }
}
