import { NextRequest, NextResponse } from 'next/server';
import {
  isQuizPartyStoreConfigured,
  getServer,
  getQuestion,
  submitAnswer,
} from '@/utils/quizPartyStore';

export async function POST(request: NextRequest) {
  try {
    if (!isQuizPartyStoreConfigured()) {
      return NextResponse.json(
        { error: 'Quiz party store (AWS DynamoDB) is not configured.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const serverId = typeof body.server_id === 'string' ? body.server_id.trim() : (body.serverId ?? '').trim();
    const participantId = typeof body.participant_id === 'string' ? body.participant_id.trim() : (body.participantId ?? '').trim();
    const questionIndex = Math.max(0, Math.floor(Number(body.question_index ?? body.questionIndex)));
    const choiceIndex = Math.max(0, Math.min(3, Math.floor(Number(body.choice_index ?? body.choiceIndex))));
    const timeMs = typeof body.time_ms === 'number' ? body.time_ms : null;

    if (!serverId || !participantId) {
      return NextResponse.json(
        { error: 'server_id and participant_id are required.' },
        { status: 400 }
      );
    }

    const server = await getServer(serverId);
    if (!server || server.status !== 'active') {
      return NextResponse.json(
        { error: 'Quiz is not active or not found.' },
        { status: 400 }
      );
    }

    const question = await getQuestion(serverId, questionIndex);
    if (!question) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    const correct = choiceIndex === question.correct_choice_index;
    const { points, total_score: newScore } = await submitAnswer({
      serverId,
      participantId,
      questionIndex,
      choiceIndex,
      correct,
      timeMs,
    });

    return NextResponse.json({
      correct,
      points_earned: points,
      total_score: newScore,
    });
  } catch (e) {
    console.error('Quiz answer error:', e);
    return NextResponse.json({ error: 'Failed to submit answer.' }, { status: 500 });
  }
}
