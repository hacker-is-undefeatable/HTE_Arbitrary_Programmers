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
      console.error('Quiz attempt: Missing required fields', { userId, subject, topic, question });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('Saving quiz attempt with service role:', { userId, subject, topic });
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
      console.error('Quiz attempt insert error:', error);
      
      // If it's a permission error after trying with service role,
      // this indicates an RLS policy issue
      if (error.code === 'PGRST301' || error.message.includes('permission')) {
        console.error('RLS Permission denied - service role unable to insert. Check Supabase RLS policies and ensure INSERT policy exists.');
      }
      
      return NextResponse.json(
        { error: error.message, code: error.code, details: error },
        { status: 500 }
      );
    }

    console.log('Quiz attempt saved successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Quiz attempt error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
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
