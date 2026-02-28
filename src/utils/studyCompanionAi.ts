import { computeBurnoutRisk, type BurnoutInput, type BurnoutRisk } from './burnoutEngine';

export type BurnoutAiRequest = {
  burnoutInput: BurnoutInput;
  profile: {
    name?: string | null;
    role: 'high_school' | 'college';
    preferred_explanation_style: 'step-by-step' | 'conceptual' | 'visual';
  };
  context: {
    subject: 'math' | 'python';
    topic?: string;
  };
};

export type BurnoutAiResponse = {
  risk: BurnoutRisk;
  coachMessage: string;
  shouldSuggestBreak: boolean;
  suggestedBreakMinutes: number | null;
  psyFact: string;
};

export async function getBurnoutCoachingWithPsyFact(
  payload: BurnoutAiRequest
): Promise<BurnoutAiResponse> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o-mini';
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  const risk = computeBurnoutRisk(payload.burnoutInput);

  if (!endpoint || !apiKey) {
    return {
      risk,
      coachMessage:
        'You have been studying for a while. Short breaks help your brain recharge so you remember more when you come back.',
      shouldSuggestBreak: risk.level !== 'low',
      suggestedBreakMinutes: risk.level === 'high' ? 10 : 5,
      psyFact:
        'Psychology research suggests that spacing your study with brief breaks reduces fatigue and improves long-term memory.',
    };
  }

  const systemPrompt = `
You are a warm, concise study coach who prevents burnout and supports a growth mindset.
You must respond in valid JSON ONLY, matching this type:

type BurnoutCoachResponse = {
  coachMessage: string;
  shouldSuggestBreak: boolean;
  suggestedBreakMinutes: number | null;
  psyFact: string;
};

Rules:
- coachMessage: <= 2 sentences, friendly, no guilt or shame.
- If burnout level is "high", usually suggest an 8–15 minute break.
- psyFact: 1–2 sentence, evidence-based fact about burnout, recovery, learning, or attention, written for teenagers/college students.
- No citations or URLs. No markdown. Plain text only.
`;

  const userContent = JSON.stringify({
    risk,
    profile: payload.profile,
    context: payload.context,
  });

  const res = await fetch(
    `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.5,
        max_tokens: 220,
        response_format: { type: 'json_object' },
      }),
    }
  );

  if (!res.ok) {
    return {
      risk,
      coachMessage:
        'You’ve been putting in good effort. Taking a short break can help you come back with better focus.',
      shouldSuggestBreak: risk.level !== 'low',
      suggestedBreakMinutes: risk.level === 'high' ? 10 : 5,
      psyFact:
        'Studies on attention show that people learn better in focused blocks with brief pauses instead of long, uninterrupted sessions.',
    };
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(content) as {
      coachMessage?: string;
      shouldSuggestBreak?: boolean;
      suggestedBreakMinutes?: number | null;
      psyFact?: string;
    };

    return {
      risk,
      coachMessage:
        parsed.coachMessage ||
        'You’re working hard. A quick pause can actually help your brain consolidate what you just learned.',
      shouldSuggestBreak:
        typeof parsed.shouldSuggestBreak === 'boolean'
          ? parsed.shouldSuggestBreak
          : risk.level !== 'low',
      suggestedBreakMinutes:
        typeof parsed.suggestedBreakMinutes === 'number'
          ? parsed.suggestedBreakMinutes
          : risk.level === 'high'
          ? 10
          : 5,
      psyFact:
        parsed.psyFact ||
        'Short recovery periods between study blocks reduce mental fatigue and make it easier to stay motivated over time.',
    };
  } catch {
    return {
      risk,
      coachMessage:
        'You’ve been focused for a while. A small break can keep your energy and motivation up.',
      shouldSuggestBreak: risk.level !== 'low',
      suggestedBreakMinutes: risk.level === 'high' ? 10 : 5,
      psyFact:
        'Cognitive science shows that alternating focus and rest leads to better learning than nonstop cramming.',
    };
  }
}

export type RantSupportRequest = {
  text: string;
  profile: {
    name?: string | null;
    role: 'high_school' | 'college';
  };
};

export type RantSupportResponse = {
  reply: string;
};

export async function getRantSupportMessage(
  payload: RantSupportRequest
): Promise<RantSupportResponse> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o-mini';
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  if (!endpoint || !apiKey) {
    return {
      reply:
        "I hear you—studying can feel really heavy sometimes. It's okay to vent and it's okay to take things one small step at a time.",
    };
  }

  const systemPrompt = `
You are a kind, emotionally intelligent study companion.
Your job is to listen to a student's rant about studying and respond with:
- validation and empathy,
- gentle encouragement,
- one or two practical, small next steps.

Constraints:
- Reply in plain text, 3–5 sentences max.
- No judgment, no toxic positivity, no shaming.
- Normalize their feelings and remind them that struggle is part of learning.
`;

  const userContent = JSON.stringify({
    rant: payload.text,
    profile: payload.profile,
  });

  const res = await fetch(
    `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 220,
      }),
    }
  );

  if (!res.ok) {
    return {
      reply:
        "That sounds really frustrating, and it's completely valid to feel that way. Try to be kind to yourself—learning is messy, and taking a short breather or breaking the task into something tiny is often the strongest move.",
    };
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    return {
      reply:
        "Thanks for sharing how you're feeling. Even when it feels stuck, you're still showing up—that matters. Maybe pick one tiny thing to do next, then give yourself permission to pause.",
    };
  }

  return { reply: content };
}


