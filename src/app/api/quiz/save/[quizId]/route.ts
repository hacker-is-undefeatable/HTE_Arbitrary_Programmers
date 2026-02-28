import { NextRequest, NextResponse } from 'next/server';
import {
  isQuizPartyStoreConfigured,
  getQuizContent,
  saveQuizForUser,
} from '@/utils/quizPartyStore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    if (!isQuizPartyStoreConfigured()) {
      return NextResponse.json(
        { error: 'Quiz party store (AWS DynamoDB) is not configured.' },
        { status: 503 }
      );
    }

    const { quizId } = await params;
    if (!quizId) {
      return NextResponse.json({ error: 'quiz_id is required.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';

    if (!userId) {
      return NextResponse.json(
        { error: 'You must be logged in to save a quiz. user_id is required.' },
        { status: 401 }
      );
    }

    const quiz = await getQuizContent(quizId);
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    await saveQuizForUser(quizId, userId);

    return NextResponse.json({ saved: true, quiz_id: quizId });
  } catch (e) {
    console.error('Quiz save error:', e);
    return NextResponse.json({ error: 'Failed to save quiz.' }, { status: 500 });
  }
}
