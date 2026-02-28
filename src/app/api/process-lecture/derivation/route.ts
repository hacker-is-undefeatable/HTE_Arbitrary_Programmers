import { NextRequest, NextResponse } from 'next/server';
import { generateDerivation } from '@/utils/aiService';

export async function POST(request: NextRequest) {
  try {
    const { formula, context, isRetry } = await request.json();

    if (!formula) {
      return NextResponse.json({ error: 'Formula is required' }, { status: 400 });
    }

    console.log(`Derivation request - concept: "${formula}", context length: ${context?.length || 0}, isRetry: ${isRetry}`);

    // First attempt
    let derivation = await generateDerivation(formula, context || '', isRetry === true);
    console.log(`First attempt result - steps: ${derivation.steps?.length || 0}`);

    // If first attempt returned empty, retry with detailed prompt
    if (!derivation.steps?.length) {
      console.log('First attempt empty, retrying with detailed prompt...');
      derivation = await generateDerivation(formula, context || '', true);
      console.log(`Second attempt result - steps: ${derivation.steps?.length || 0}`);
      
      // If still empty, try one more time
      if (!derivation.steps?.length) {
        console.log('Second attempt empty, final retry...');
        derivation = await generateDerivation(formula, context || '', true);
        console.log(`Third attempt result - steps: ${derivation.steps?.length || 0}`);
      }
    }

    return NextResponse.json({ success: true, data: derivation });
  } catch (error) {
    console.error('Error generating derivation:', error);
    return NextResponse.json(
      { error: 'Failed to generate derivation' },
      { status: 500 }
    );
  }
}
