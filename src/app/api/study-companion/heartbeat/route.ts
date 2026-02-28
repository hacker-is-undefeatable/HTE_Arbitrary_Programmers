import { NextResponse } from 'next/server';
import { type BurnoutInput } from '@/utils/burnoutEngine';
import { getBurnoutCoachingWithPsyFact } from '@/utils/studyCompanionAi';

export async function POST(req: Request) {
  const body = await req.json();

  const burnoutInput: BurnoutInput = {
    sessionMinutes: body.sessionMinutes ?? 0,
    totalMinutesToday: body.totalMinutesToday ?? 0,
    idleSecondsLast10Min: body.idleSecondsLast10Min ?? 0,
    accuracyLastWindow:
      typeof body.accuracyLastWindow === 'number'
        ? body.accuracyLastWindow
        : null,
    accuracyPrevWindow:
      typeof body.accuracyPrevWindow === 'number'
        ? body.accuracyPrevWindow
        : null,
    avgTimePerQuestionCurrent:
      typeof body.avgTimePerQuestionCurrent === 'number'
        ? body.avgTimePerQuestionCurrent
        : null,
    avgTimePerQuestionBaseline:
      typeof body.avgTimePerQuestionBaseline === 'number'
        ? body.avgTimePerQuestionBaseline
        : null,
    hintsLastWindow: body.hintsLastWindow ?? 0,
    selfReportedTiredness: body.selfReportedTiredness ?? 0,
  };

  const profile = body.profile || {};

  const ai = await getBurnoutCoachingWithPsyFact({
    burnoutInput,
    profile: {
      name: profile.name ?? null,
      role: profile.role ?? 'college',
      preferred_explanation_style:
        profile.preferred_explanation_style ?? 'step-by-step',
    },
    context: {
      subject: body.subject ?? 'math',
      topic: body.topic,
    },
  });

  return NextResponse.json({
    burnoutRisk: ai.risk.risk,
    burnoutLevel: ai.risk.level,
    contributingFactors: ai.risk.contributingFactors,
    coachMessage: ai.coachMessage,
    shouldSuggestBreak: ai.shouldSuggestBreak,
    suggestedBreakMinutes: ai.suggestedBreakMinutes,
    psyFact: ai.psyFact,
  });
}

