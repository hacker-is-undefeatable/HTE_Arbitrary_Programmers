import { NextRequest, NextResponse } from 'next/server';
import { generateMistakeExplanation } from '@/utils/aiService';

/**
 * POST /api/ai-explanation/mistake
 * Generate AI explanation for a mistake
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      question,
      userAnswer,
      correctAnswer,
      topic,
      explanationStyle = 'step-by-step',
      masteryLevel = 50,
    } = body;

    if (!question || !userAnswer || !correctAnswer) {
      return NextResponse.json(
        { error: 'Missing required fields: question, userAnswer, correctAnswer' },
        { status: 400 }
      );
    }

    const explanation = await generateMistakeExplanation(
      question,
      userAnswer,
      correctAnswer,
      topic || 'general',
      explanationStyle,
      masteryLevel
    );

    return NextResponse.json(explanation);
  } catch (error) {
    console.error('Error generating mistake explanation:', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    );
  }
}
