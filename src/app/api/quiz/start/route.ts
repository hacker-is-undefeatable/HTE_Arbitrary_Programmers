import { NextRequest, NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';
import { getLectureSessionForQuiz } from '@/app/api/quick-create/route';
import {
  isQuizPartyStoreConfigured,
  getServer,
  updateServer,
  saveQuizContent,
} from '@/utils/quizPartyStore';

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function getClientKey(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  let times = rateLimitMap.get(key) ?? [];
  times = times.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (times.length >= RATE_LIMIT_MAX) return false;
  times.push(now);
  rateLimitMap.set(key, times);
  return true;
}

let openaiClient: AzureOpenAI | null = null;
function getQuizOpenAIClient(): AzureOpenAI {
  if (!openaiClient) {
    openaiClient = new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21',
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o-mini'}`,
    });
  }
  return openaiClient;
}

const QUIZ_GENERATION_PROMPT = `[BEGIN PROMPT]
You are an educational question generator. Input:
- lecture_title: {{lecture_title}}
- lecture_metadata: {{lecture_metadata}}   # JSON with timestamps, sections, etc.
- lecture_text: {{lecture_text}}           # full text or transcript
- desired_counts: {{desired_counts}}       # JSON e.g. {"easy":5,"medium":5,"hard":5}
- question_style: {{question_style}}       # e.g. "multiple_choice"

Task:
1. Read the lecture_text and lecture_metadata.
2. Produce a list of questions grouped by difficulty: easy, medium, hard.
3. For each question produce a JSON object with fields:
   - question_text: concise question that tests understanding (not verbatim).
   - choices: array of 4 answer choices (strings).
   - correct_choice_index: integer 0-3.
   - explanation: 1-3 sentence explanation of the correct answer.
   - difficulty: "easy"|"medium"|"hard".
   - source_span: a short excerpt from lecture_text or a timestamp range indicating where the answer is supported.
4. Ensure:
   - Questions progressively increase in cognitive demand from easy to hard.
   - Distractors are plausible and reflect common misconceptions or close confusions.
   - Avoid copying sentences verbatim from lecture_text; paraphrase and test comprehension.
   - Cover major sections of the lecture; do not focus all questions on a single paragraph.
5. Output only valid JSON: an object with keys "lecture_title", "questions" where "questions" is an array of question objects in the order easy→medium→hard.
6. Do not include any commentary or metadata outside the JSON.

Example output structure:
{
  "lecture_title": "...",
  "questions": [
    {
      "question_text": "...",
      "choices": ["...","...","...","..."],
      "correct_choice_index": 2,
      "explanation": "...",
      "difficulty": "easy",
      "source_span": "..."
    },
    ...
  ]
}
[END PROMPT]`;

function buildPrompt(params: {
  lecture_title: string;
  lecture_metadata: string;
  lecture_text: string;
  desired_counts: string;
  question_style: string;
}): string {
  return QUIZ_GENERATION_PROMPT
    .replace('{{lecture_title}}', params.lecture_title)
    .replace('{{lecture_metadata}}', params.lecture_metadata)
    .replace('{{lecture_text}}', params.lecture_text)
    .replace('{{desired_counts}}', params.desired_counts)
    .replace('{{question_style}}', params.question_style);
}

export async function POST(request: NextRequest) {
  try {
    if (!isQuizPartyStoreConfigured()) {
      return NextResponse.json(
        { error: 'Quiz party store (AWS DynamoDB) is not configured.' },
        { status: 503 }
      );
    }

    if (!checkRateLimit(getClientKey(request))) {
      return NextResponse.json(
        { error: 'Too many quiz generation requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const serverId = typeof body.server_id === 'string' ? body.server_id.trim() : (body.serverId ?? '').trim();
    const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : null;

    if (!serverId) {
      return NextResponse.json({ error: 'server_id is required.' }, { status: 400 });
    }

    const server = await getServer(serverId);
    if (!server) {
      return NextResponse.json({ error: 'Quiz server not found.' }, { status: 404 });
    }
    if (server.status !== 'waiting' && server.status !== 'generating') {
      return NextResponse.json({ error: 'Quiz already started or ended.' }, { status: 400 });
    }

    const effectiveSessionId = server.lecture_session_id || sessionId;
    if (!effectiveSessionId) {
      return NextResponse.json(
        { error: 'No lecture session linked. Provide session_id when creating or starting the quiz.' },
        { status: 400 }
      );
    }

    await updateServer(serverId, { status: 'generating' });

    const session = await getLectureSessionForQuiz(effectiveSessionId);
    if (!session) {
      await updateServer(serverId, { status: 'waiting' });
      return NextResponse.json(
        { error: 'Lecture session not found or has no content for quiz generation.' },
        { status: 404 }
      );
    }

    const lectureText = (session.transcript || session.notes_text || session.summary || '').slice(0, 24000);
    const lectureMetadata = JSON.stringify({
      title: session.lecture_title,
      created_at: session.created_at,
      has_transcript: !!session.transcript,
      has_notes: !!session.notes_text,
    });
    const desiredCounts = JSON.stringify({ easy: 5, medium: 5, hard: 5 });
    const prompt = buildPrompt({
      lecture_title: session.lecture_title,
      lecture_metadata: lectureMetadata,
      lecture_text: lectureText,
      desired_counts: desiredCounts,
      question_style: 'multiple_choice',
    });

    let questions: Array<{
      question_text: string;
      choices: string[];
      correct_choice_index: number;
      explanation: string;
      difficulty: string;
      source_span: string;
    }> = [];

    try {
      const client = getQuizOpenAIClient();
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 4000,
      });
      const content = response.choices[0]?.message?.content || '{}';
      const raw = content.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      const list = Array.isArray(parsed.questions) ? parsed.questions : [];
      questions = list
        .filter(
          (q: unknown) =>
            q &&
            typeof q === 'object' &&
            typeof (q as { question_text?: string }).question_text === 'string' &&
            Array.isArray((q as { choices?: unknown }).choices) &&
            typeof (q as { correct_choice_index?: number }).correct_choice_index === 'number'
        )
        .map((q: Record<string, unknown>) => ({
          question_text: String(q.question_text),
          choices: (q.choices as string[]).slice(0, 4).map(String),
          correct_choice_index: Math.min(3, Math.max(0, Number(q.correct_choice_index))),
          explanation: String(q.explanation ?? ''),
          difficulty: ['easy', 'medium', 'hard'].includes(String(q.difficulty)) ? String(q.difficulty) : 'medium',
          source_span: String(q.source_span ?? ''),
        }));
    } catch (aiErr) {
      console.error('Quiz AI generation error:', aiErr);
      await updateServer(serverId, { status: 'waiting' });
      return NextResponse.json(
        { error: 'Failed to generate questions. Check AZURE_OPENAI_* env and try again.' },
        { status: 502 }
      );
    }

    const quizId = serverId;
    await saveQuizContent(serverId, {
      quizId,
      title: session.lecture_title,
      questionCount: questions.length,
      questions: questions.map((q, i) => ({
        question_index: i,
        question_text: q.question_text,
        choices: q.choices,
        correct_choice_index: q.correct_choice_index,
        explanation: q.explanation,
        difficulty: q.difficulty,
        source_span: q.source_span,
      })),
      metadata: { lecture_session_id: effectiveSessionId, desired_counts: { easy: 5, medium: 5, hard: 5 } },
    });

    await updateServer(serverId, {
      status: 'active',
      started_at: new Date().toISOString(),
    });

    return NextResponse.json({
      quiz_id: quizId,
      server_id: serverId,
      question_count: questions.length,
    });
  } catch (e) {
    console.error('Quiz start error:', e);
    return NextResponse.json({ error: 'Failed to start quiz.' }, { status: 500 });
  }
}
