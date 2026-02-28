import { NextRequest, NextResponse } from 'next/server';
import {
  isQuizPartyStoreConfigured,
  getQuizContent,
  recordDownload,
} from '@/utils/quizPartyStore';

export async function GET(
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

    const { searchParams } = new URL(request.url);
    const fileType = searchParams.get('format') ?? 'json';
    const userId = searchParams.get('user_id') ?? '';
    const guestDisplayName = searchParams.get('guest_display_name') ?? '';

    const quiz = await getQuizContent(quizId);
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    const payload = {
      lecture_title: quiz.title,
      generated_at: quiz.generated_at,
      question_count: quiz.question_count,
      metadata: quiz.metadata,
      questions: quiz.questions.map((q) => ({
        question_text: q.question_text,
        choices: q.choices,
        correct_choice_index: q.correct_choice_index,
        explanation: q.explanation,
        difficulty: q.difficulty,
        source_span: q.source_span,
      })),
    };

    await recordDownload({
      serverId: quizId,
      userId: userId || null,
      guestDisplayName: guestDisplayName || null,
      fileType,
    });

    if (fileType === 'pdf') {
      return new NextResponse(
        'PDF export not implemented. Use format=json to download as JSON.',
        { status: 501, headers: { 'Content-Type': 'text/plain' } }
      );
    }

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="quiz-${quizId.slice(0, 8)}.json"`,
      },
    });
  } catch (e) {
    console.error('Quiz download error:', e);
    return NextResponse.json({ error: 'Failed to download quiz.' }, { status: 500 });
  }
}
