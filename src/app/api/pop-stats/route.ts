import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const userId = body.userId as string | undefined;
    const incrementRaw = body.increment;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const increment =
      typeof incrementRaw === 'number' && Number.isFinite(incrementRaw)
        ? Math.max(1, Math.floor(incrementRaw))
        : 1;

    const { data: existingRows, error: selectError } = await supabase
      .from('pop_click_stats')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;
    const nowIso = new Date().toISOString();

    let userTotalPops: number;

    if (existing) {
      const newTotal = Number(existing.total_pops || 0) + increment;
      const { data: updated, error: updateError } = await supabase
        .from('pop_click_stats')
        .update({ total_pops: newTotal, updated_at: nowIso })
        .eq('user_id', userId)
        .select('*')
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      userTotalPops = Number(updated.total_pops || 0);
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('pop_click_stats')
        .insert([
          {
            user_id: userId,
            total_pops: increment,
            updated_at: nowIso,
          },
        ])
        .select('*')
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      userTotalPops = Number(inserted.total_pops || 0);
    }

    return NextResponse.json({ userTotalPops });
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

    const { data: userRows, error: userError } = await supabase
      .from('pop_click_stats')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    const userTotalPops =
      userRows && userRows.length > 0 ? Number(userRows[0].total_pops || 0) : 0;

    const { data: leaderboardRows, error: leaderboardError } = await supabase
      .from('pop_click_stats')
      .select('user_id,total_pops,profiles(name)')
      .order('total_pops', { ascending: false })
      .limit(5);

    if (leaderboardError) {
      return NextResponse.json({ error: leaderboardError.message }, { status: 500 });
    }

    const leaderboard =
      (leaderboardRows || []).map((row: any) => ({
        userId: row.user_id as string,
        name: row.profiles?.name as string | null,
        totalPops: Number(row.total_pops || 0),
      })) ?? [];

    return NextResponse.json({ userTotalPops, leaderboard });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

