import { NextRequest, NextResponse } from 'next/server';
import {
  isQuizPartyStoreConfigured,
  generateInviteCode,
  inviteCodeExists,
  createServer,
} from '@/utils/quizPartyStore';

export async function POST(request: NextRequest) {
  try {
    if (!isQuizPartyStoreConfigured()) {
      return NextResponse.json(
        { error: 'Quiz party store (AWS DynamoDB) is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const maxPlayers = Math.floor(Number(body.max_players ?? body.maxPlayers ?? 10));
    const durationMinutes = Math.floor(Number(body.duration_minutes ?? body.durationMinutes ?? 30));
    const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : null;
    const userId = typeof body.user_id === 'string' ? body.user_id.trim() : null;

    if (maxPlayers < 2 || maxPlayers > 100) {
      return NextResponse.json(
        { error: 'Max players must be between 2 and 100.' },
        { status: 400 }
      );
    }
    if (durationMinutes < 5 || durationMinutes > 120) {
      return NextResponse.json(
        { error: 'Quiz duration must be between 5 and 120 minutes.' },
        { status: 400 }
      );
    }

    let inviteCode = generateInviteCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const exists = await inviteCodeExists(inviteCode);
      if (!exists) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Could not generate unique invite code. Please try again.' },
        { status: 500 }
      );
    }

    const server = await createServer({
      inviteCode,
      hostUserId: userId || null,
      lectureSessionId: sessionId,
      maxPlayers,
      durationMinutes,
    });

    return NextResponse.json({
      server_id: server.id,
      invite_code: server.invite_code,
    });
  } catch (e) {
    const err = e as { name?: string };
    if (err.name === 'ResourceNotFoundException') {
      // #region agent log
      fetch('http://127.0.0.1:7390/ingest/d8f06ed9-f6f5-4047-ae54-ea963d82f73f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'26d02b'},body:JSON.stringify({sessionId:'26d02b',location:'src/app/api/quiz/create/route.ts:catch',message:'DynamoDB table not found',data:{errorName:err.name},hypothesisId:'A',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'Quiz Party table not set up. From the project root run: npm run quiz-party:create-table' },
        { status: 503 }
      );
    }
    console.error('Quiz create error:', e);
    return NextResponse.json({ error: 'Failed to create quiz server.' }, { status: 500 });
  }
}
