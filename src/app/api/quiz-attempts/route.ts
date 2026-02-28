import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase';

/**
 * POST /api/quiz-attempts
 * Save a quiz attempt
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { userId, subject, topic, question, userAnswer, correctAnswer, isCorrect } = body;

    if (!userId || !subject || !topic || !question) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert([
        {
          user_id: userId,
          subject,
          topic,
          question,
          user_answer: userAnswer,
          correct_answer: correctAnswer,
          is_correct: isCorrect,
          timestamp: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/quiz-attempts?userId=xxx&subject=xxx&topic=xxx
 * Get quiz attempts for a user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const subject = searchParams.get('subject');
    const topic = searchParams.get('topic');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId);

    if (subject) query = query.eq('subject', subject);
    if (topic) query = query.eq('topic', topic);

    const { data, error } = await query.order('timestamp', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
