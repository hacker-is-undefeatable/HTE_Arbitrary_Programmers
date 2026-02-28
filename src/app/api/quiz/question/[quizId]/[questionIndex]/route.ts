import { NextRequest, NextResponse } from 'next/server';
import {
  isQuizPartyStoreConfigured,
  getQuestion,
} from '@/utils/quizPartyStore';

export async function GET(
  _request: NextRequest,
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

    const questionIndex = Math.max(0, Math.floor(Number(qIndexParam)));
    const question = await getQuestion(quizId, questionIndex);

    if (!question) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    return NextResponse.json({
      question_index: question.question_index,
      question_text: question.question_text,
      choices: question.choices,
      correct_choice_index: question.correct_choice_index,
      explanation: question.explanation,
      difficulty: question.difficulty,
      source_span: question.source_span,
    });
  } catch (e) {
    console.error('Quiz question fetch error:', e);
    return NextResponse.json({ error: 'Failed to fetch question.' }, { status: 500 });
  }
}
