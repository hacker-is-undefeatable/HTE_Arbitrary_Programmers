import { NextResponse } from 'next/server';
import { getRantSupportMessage } from '@/utils/studyCompanionAi';

export async function POST(req: Request) {
  const body = await req.json();

  const text = String(body.text || '').trim();

  if (!text) {
    return NextResponse.json(
      {
        reply:
          "If you ever feel like venting about your studies, I'm here to listen whenever you're ready.",
      },
      { status: 200 }
    );
  }

  const profile = body.profile || {};

  const support = await getRantSupportMessage({
    text,
    profile: {
      name: profile.name ?? null,
      role: profile.role ?? 'college',
    },
  });

  return NextResponse.json({ reply: support.reply });
}

