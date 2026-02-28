import { NextRequest, NextResponse } from 'next/server';
import {
  isQuizPartyStoreConfigured,
  getQuizContent,
  getParticipantAnswer,
} from '@/utils/quizPartyStore';

export async function GET(request: NextRequest) {
  try {
    if (!isQuizPartyStoreConfigured()) {
      return NextResponse.json(
        { error: 'Quiz party store (AWS DynamoDB) is not configured.' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('server_id') ?? searchParams.get('serverId') ?? '';
    const participantId = searchParams.get('participant_id') ?? searchParams.get('participantId') ?? '';

    if (!serverId || !participantId) {
      return NextResponse.json(
        { error: 'server_id and participant_id are required.' },
        { status: 400 }
      );
    }

    const quiz = await getQuizContent(serverId);
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    const totalQuestions = quiz.question_count ?? 0;
    const answers: Record<number, { choiceIndex: number; correct: boolean }> = {};
    for (let i = 0; i < totalQuestions; i++) {
      const a = await getParticipantAnswer(serverId, participantId, i);
      if (a) answers[i] = a;
    }

    return NextResponse.json({
      server_id: serverId,
      participant_id: participantId,
      total_questions: totalQuestions,
      answers,
    });
  } catch (e) {
    console.error('Quiz results error:', e);
    return NextResponse.json(
      { error: 'Failed to fetch results.' },
      { status: 500 }
    );
  }
}
