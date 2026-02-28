import { NextRequest, NextResponse } from 'next/server';
import {
  isQuizPartyStoreConfigured,
  getServerByInviteCode,
  getParticipantCount,
  addParticipant,
} from '@/utils/quizPartyStore';

function generateGuestTagDataUri(): string {
  const salt =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `s${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect data-salt="${salt}" width="16" height="16" fill="none"/><path fill="%236b7280" d="M8 1L2 4v4c0 3.5 2.5 5.5 6 6 3.5-.5 6-2.5 6-6V4L8 1z"/><text x="8" y="11" font-size="8" font-weight="bold" fill="white" text-anchor="middle" font-family="system-ui,sans-serif">G</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const CODE_REGEX = /^[A-Za-z0-9]{6}$/;

export async function POST(request: NextRequest) {
  try {
    if (!isQuizPartyStoreConfigured()) {
      return NextResponse.json(
        { error: 'Quiz party store (AWS DynamoDB) is not configured.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    let code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const displayName =
      typeof body.display_name === 'string'
        ? body.display_name.trim()
        : (body.displayName ?? '').trim();
    const userId = typeof body.user_id === 'string' ? body.user_id.trim() : null;

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: 'Invite code must be exactly 6 characters (letters and digits only).' },
        { status: 400 }
      );
    }
    if (!CODE_REGEX.test(code)) {
      return NextResponse.json(
        { error: 'Invite code may only contain letters A–Z and digits 0–9. No spaces or punctuation.' },
        { status: 400 }
      );
    }

    const server = await getServerByInviteCode(code);
    if (!server) {
      return NextResponse.json(
        { error: 'Invalid or expired invite code.' },
        { status: 404 }
      );
    }

    if (server.status !== 'waiting' && server.status !== 'generating') {
      return NextResponse.json(
        { error: 'This quiz has already started or ended.' },
        { status: 400 }
      );
    }

    const count = await getParticipantCount(server.id);
    if (count >= server.max_players) {
      return NextResponse.json(
        { error: 'This quiz is full.' },
        { status: 400 }
      );
    }

    const isGuest = !userId;
    const name = displayName || (isGuest ? 'Guest' : 'Player');
    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Display name is too long.' },
        { status: 400 }
      );
    }

    const guestTagDataUri = isGuest ? generateGuestTagDataUri() : null;

    const participant = await addParticipant({
      serverId: server.id,
      userId: userId || null,
      displayName: name,
      guest: isGuest,
      guestTagDataUri,
    });

    return NextResponse.json({
      participant_id: participant.id,
      quiz_server_id: server.id,
      display_name: participant.display_name,
      guest: participant.guest,
      guest_tag_data_uri: participant.guest_tag_data_uri ?? undefined,
    });
  } catch (e) {
    console.error('Quiz join error:', e);
    return NextResponse.json({ error: 'Failed to join quiz.' }, { status: 500 });
  }
}
