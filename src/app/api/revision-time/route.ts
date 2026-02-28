import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { userId, durationSeconds, startedAt, endedAt } = body;

    if (!userId || durationSeconds === undefined || !startedAt || !endedAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const safeDuration = Math.max(0, Math.floor(Number(durationSeconds) || 0));

    const { data, error } = await supabase
      .from('revision_time_logs')
      .insert([
        {
          user_id: userId,
          duration_seconds: safeDuration,
          started_at: startedAt,
          ended_at: endedAt,
        },
      ])
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('revision_time_logs')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
