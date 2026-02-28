import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase';

/**
 * POST /api/coding-submissions
 * Save a coding submission
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { userId, challengeId, code, isCorrect, errorMessage } = body;

    if (!userId || !challengeId || !code) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('coding_submissions')
      .insert([
        {
          user_id: userId,
          challenge_id: challengeId,
          code,
          is_correct: isCorrect,
          error_message: errorMessage,
          submitted_at: new Date().toISOString(),
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
 * GET /api/coding-submissions?userId=xxx&challengeId=xxx
 * Get coding submissions
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const challengeId = searchParams.get('challengeId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('coding_submissions')
      .select('*')
      .eq('user_id', userId);

    if (challengeId) query = query.eq('challenge_id', challengeId);

    const { data, error } = await query.order('submitted_at', { ascending: false });

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
