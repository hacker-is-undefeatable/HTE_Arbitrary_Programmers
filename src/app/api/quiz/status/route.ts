import { NextRequest, NextResponse } from 'next/server';
import {
  isQuizPartyStoreConfigured,
  getServer,
  getQuizContent,
  listParticipants,
  getAnsweredCountForQuestion,
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

    if (!serverId) {
      return NextResponse.json(
        { error: 'server_id is required.' },
        { status: 400 }
      );
    }

    const server = await getServer(serverId);
    if (!server) {
      return NextResponse.json({ error: 'Quiz server not found.' }, { status: 404 });
    }

    let quizId: string | null = null;
    let totalQuestions = 0;
    let currentQuestion: Record<string, unknown> | null = null;

    let participantCount = 0;
    let answeredCount = 0;

    if (server.status === 'active' || server.status === 'ended') {
      const quiz = await getQuizContent(serverId);
      const participants = await listParticipants(serverId, true);
      participantCount = participants.length;
      const idx = Math.min(server.current_question_index, (quiz?.question_count ?? 1) - 1);
      if (idx >= 0 && participantCount > 0) {
        answeredCount = await getAnsweredCountForQuestion(serverId, idx);
      }
      if (quiz) {
        quizId = quiz.quiz_id;
        totalQuestions = quiz.question_count;
        if (idx >= 0 && totalQuestions > 0 && quiz.questions[idx]) {
          const q = quiz.questions[idx]!;
          currentQuestion = {
            question_index: q.question_index,
            question_text: q.question_text,
            choices: q.choices,
            difficulty: q.difficulty,
            source_span: q.source_span,
          };
        }
      }
    }

    return NextResponse.json({
      server_id: server.id,
      status: server.status,
      started_at: server.started_at,
      ended_at: server.ended_at,
      current_question_index: server.current_question_index,
      total_questions: totalQuestions,
      quiz_id: quizId,
      current_question: currentQuestion,
      participant_count: participantCount,
      answered_count: answeredCount,
    });
  } catch (e) {
    console.error('Quiz status error:', e);
    return NextResponse.json({ error: 'Failed to fetch status.' }, { status: 500 });
  }
}
