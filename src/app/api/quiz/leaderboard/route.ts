import { NextRequest, NextResponse } from 'next/server';
import { isQuizPartyStoreConfigured, listParticipants } from '@/utils/quizPartyStore';

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

    const participants = await listParticipants(serverId, true);

    return NextResponse.json({
      leaderboard: participants.map((p) => ({
        participant_id: p.id,
        display_name: p.display_name,
        guest: p.guest,
        guest_tag_data_uri: p.guest_tag_data_uri ?? undefined,
        score: p.score,
        joined_at: p.joined_at,
      })),
    });
  } catch (e) {
    console.error('Quiz leaderboard error:', e);
    return NextResponse.json({ error: 'Failed to fetch leaderboard.' }, { status: 500 });
  }
}
