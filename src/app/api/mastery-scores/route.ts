import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase';

/**
 * POST /api/mastery-scores
 * Update or create a mastery score
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { userId, subject, topic, masteryScore } = body;

    if (!userId || !subject || !topic || masteryScore === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Upsert (insert or update)
    const { data, error } = await supabase
      .from('mastery_scores')
      .upsert(
        {
          user_id: userId,
          subject,
          topic,
          mastery_score: masteryScore,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'user_id,subject,topic' }
      )
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
 * GET /api/mastery-scores?userId=xxx
 * Get mastery scores for a user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const subject = searchParams.get('subject');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('mastery_scores')
      .select('*')
      .eq('user_id', userId);

    if (subject) query = query.eq('subject', subject);

    const { data, error } = await query;

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
