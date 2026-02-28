import { NextRequest, NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';
import {
  isQuizPartyStoreConfigured,
  getQuizContent,
  getQuestion,
} from '@/utils/quizPartyStore';

let openaiClient: AzureOpenAI | null = null;
function getExplainOpenAIClient(): AzureOpenAI {
  if (!openaiClient) {
    openaiClient = new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21',
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o-mini'}`,
    });
  }
  return openaiClient;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string; questionIndex: string }> }
) {
  try {
    if (!isQuizPartyStoreConfigured()) {
      return NextResponse.json(
        { error: 'Quiz party store (AWS DynamoDB) is not configured.' },
        { status: 503 }
      );
    }

    const { quizId, questionIndex: qIndexParam } = await params;
    if (!quizId) {
      return NextResponse.json({ error: 'quiz_id is required.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';

    if (!userId) {
      return NextResponse.json(
        { error: 'You must be logged in to request an explanation. user_id is required.' },
        { status: 401 }
      );
    }

    const questionIndex = Math.max(0, Math.floor(Number(qIndexParam)));

    const quiz = await getQuizContent(quizId);
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    const question = await getQuestion(quizId, questionIndex);
    if (!question) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    const correctChoice = Array.isArray(question.choices)
      ? (question.choices as string[])[question.correct_choice_index]
      : '';

    const prompt = `You are an expert tutor. Explain this quiz question in more detail for a student.

Quiz: ${quiz.title}
Question ${questionIndex + 1} (${question.difficulty}): ${question.question_text}

Choices: ${JSON.stringify(question.choices)}
Correct answer (index ${question.correct_choice_index}): ${correctChoice}

Existing short explanation: ${question.explanation}
Source from materials: ${question.source_span || 'N/A'}

Provide:
1. Step-by-step reasoning for why the correct answer is right.
2. Why the other options are wrong or less appropriate.
3. A brief tip for remembering this concept.

Keep the response clear and under 300 words.`;

    const client = getExplainOpenAIClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 600,
    });

    const explanation = response.choices[0]?.message?.content?.trim() ?? 'Unable to generate explanation.';

    return NextResponse.json({
      question_index: questionIndex,
      detailed_explanation: explanation,
    });
  } catch (e) {
    console.error('Quiz explain error:', e);
    return NextResponse.json(
      { error: 'Failed to generate explanation. Check AZURE_OPENAI_* env.' },
      { status: 502 }
    );
  }
}
