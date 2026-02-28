import { NextResponse } from 'next/server';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages?: ChatMessage[] };

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment =
      process.env.AZURE_OPENAI_DEPLOYMENT ??
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? '2024-10-21';

    if (!endpoint || !apiKey || !deployment) {
      return NextResponse.json(
        {
          error:
            'Azure OpenAI is not configured. Please set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT (or AZURE_OPENAI_DEPLOYMENT_NAME) in your .env.local file.',
        },
        { status: 500 }
      );
    }

    const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const systemPrompt = {
      role: 'system',
      content: `You are a friendly, encouraging study companion on a student learning dashboard.
Your personality: warm, supportive, knowledgeable, and a little playful.
Your job: help students understand their course material, quiz concepts, flashcard topics, revision strategies, and general study tips.
Keep responses concise (2-4 sentences max unless asked for detail).
Use encouraging language. Add the occasional emoji to feel friendly but not overdone.
If asked something outside of studying, gently redirect back to learning topics.`,
    };

    const safeMessages = Array.isArray(messages)
      ? messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-12)
      : [];

    const azureRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [systemPrompt, ...safeMessages],
        temperature: 0.75,
        max_tokens: 256,
        top_p: 0.95,
      }),
    });

    const data = await azureRes.json();

    if (!azureRes.ok) {
      const errMsg = data?.error?.message ?? 'Azure OpenAI request failed.';
      console.error('[Companion API] Azure error:', errMsg);
      return NextResponse.json({ error: errMsg }, { status: azureRes.status });
    }

    const reply =
      data?.choices?.[0]?.message?.content?.trim() ??
      "I couldn't generate a response right now. Please try again!";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('[Companion API] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error. Please try again.' },
      { status: 500 }
    );
  }
}