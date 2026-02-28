import { NextRequest, NextResponse } from 'next/server';
import { generatePythonDebugExplanation } from '@/utils/aiService';

/**
 * POST /api/ai-explanation/python-debug
 * Generate AI explanation for Python code debugging
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, error, explanationStyle = 'step-by-step' } = body;

    if (!code || !error) {
      return NextResponse.json(
        { error: 'Missing required fields: code, error' },
        { status: 400 }
      );
    }

    const explanation = await generatePythonDebugExplanation(code, error, explanationStyle);

    return NextResponse.json(explanation);
  } catch (error) {
    console.error('Error generating Python debug explanation:', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    );
  }
}
