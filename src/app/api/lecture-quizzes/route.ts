import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase';
import { generateLectureQuizzes } from '@/utils/aiService';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const userId = String(body?.userId || '').trim();
    const sessionId = String(body?.sessionId || '').trim();
    const count = Math.max(1, Math.min(10, Number(body?.count) || 5));

    if (!userId || !sessionId) {
      return NextResponse.json({ error: 'userId and sessionId are required' }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabase
      .from('lecture_sessions')
      .select('id, user_id, lecture_title, transcript, summary')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Lecture session not found.' }, { status: 404 });
    }

    const quizzes = await generateLectureQuizzes(
      session.lecture_title || 'Untitled Lecture',
      session.transcript || '',
      session.summary || '',
      count
    );

    if (!quizzes.length) {
      return NextResponse.json({ error: 'Unable to generate quizzes.' }, { status: 500 });
    }

    const { error: deleteError } = await supabase
      .from('generated_quizzes')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const rows = quizzes.map((item) => ({
      session_id: sessionId,
      user_id: userId,
      question: item.question,
      options: item.options,
      correct_answer: item.correct_answer,
      explanation: item.explanation,
    }));

    const { error: insertError } = await supabase.from('generated_quizzes').insert(rows);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ quizzes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
