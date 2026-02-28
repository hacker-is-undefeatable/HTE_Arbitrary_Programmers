import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase';

/**
 * POST /api/revision-schedule
 * Create or update a revision schedule
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { userId, subject, topic, priorityScore, nextRevisionDate } = body;

    if (!userId || !subject || !topic || priorityScore === undefined || !nextRevisionDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Upsert
    const { data, error } = await supabase
      .from('revision_schedule')
      .upsert(
        {
          user_id: userId,
          subject,
          topic,
          priority_score: priorityScore,
          next_revision_date: nextRevisionDate,
          updated_at: new Date().toISOString(),
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
 * GET /api/revision-schedule?userId=xxx
 * Get revision schedule for a user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const subject = searchParams.get('subject');
    const isOverdue = searchParams.get('isOverdue') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('revision_schedule')
      .select('*')
      .eq('user_id', userId);

    if (subject) query = query.eq('subject', subject);

    if (isOverdue) {
      const today = new Date().toISOString().split('T')[0];
      query = query.lte('next_revision_date', today);
    }

    const { data, error } = await query.order('priority_score', { ascending: false });

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
