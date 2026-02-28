import { NextRequest, NextResponse } from 'next/server';
import {
  isQuizPartyStoreConfigured,
  getServer,
  getQuizContent,
  updateServer,
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

    if (!serverId) {
      return NextResponse.json({ error: 'server_id is required.' }, { status: 400 });
    }

    const server = await getServer(serverId);
    if (!server) {
      return NextResponse.json({ error: 'Quiz server not found.' }, { status: 404 });
    }
    if (server.status !== 'active') {
      return NextResponse.json({ error: 'Quiz is not active.' }, { status: 400 });
    }

    const quiz = await getQuizContent(serverId);
    const total = quiz?.question_count ?? 0;
    const nextIndex = server.current_question_index + 1;

    if (nextIndex >= total) {
      await updateServer(serverId, {
        status: 'ended',
        ended_at: new Date().toISOString(),
      });
      return NextResponse.json({
        advanced: true,
        current_question_index: nextIndex,
        status: 'ended',
        quiz_ended: true,
      });
    }

    await updateServer(serverId, { current_question_index: nextIndex });

    return NextResponse.json({
      advanced: true,
      current_question_index: nextIndex,
      status: 'active',
      quiz_ended: false,
    });
  } catch (e) {
    console.error('Quiz advance error:', e);
    return NextResponse.json({ error: 'Failed to advance question.' }, { status: 500 });
  }
}
