import { NextRequest, NextResponse } from 'next/server';
import { generateWhyExplanation } from '@/utils/aiService';

export async function POST(request: NextRequest) {
  try {
    const { concept, context } = await request.json();

    if (!concept) {
      return NextResponse.json({ error: 'Concept is required' }, { status: 400 });
    }

    const explanation = await generateWhyExplanation(concept, context || '');

    return NextResponse.json({ success: true, data: explanation });
  } catch (error) {
    console.error('Error generating explanation:', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    );
  }
}
