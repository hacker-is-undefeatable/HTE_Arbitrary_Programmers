import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase';

/**
 * POST /api/mastery-scores
 * Update or create a mastery score
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { userId, subject, topic, masteryScore } = body;

    if (!userId || !subject || !topic || masteryScore === undefined) {
      console.error('Mastery score: Missing required fields', { userId, subject, topic, masteryScore });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('Saving mastery score with service role:', { userId, subject, topic, masteryScore });
    
    // First, try upsert with service role
    const { data, error } = await supabase
      .from('mastery_scores')
      .upsert(
        {
          user_id: userId,
          subject,
          topic,
          mastery_score: masteryScore,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'user_id,subject,topic' }
      )
      .select()
      .single();

    if (error) {
      console.error('Mastery score upsert error:', error);
      
      // If it's a permission error (403), try insert instead
      if (error.code === 'PGRST301' || error.message.includes('permission')) {
        console.log('Permission error detected, trying insert...');
        const { data: insertData, error: insertError } = await supabase
          .from('mastery_scores')
          .insert({
            user_id: userId,
            subject,
            topic,
            mastery_score: masteryScore,
            last_updated: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Insert also failed:', insertError);
          return NextResponse.json(
            { error: insertError.message, code: insertError.code },
            { status: 500 }
          );
        }
        
        console.log('Insert succeeded after permission error');
        return NextResponse.json(insertData);
      }
      
      return NextResponse.json(
        { error: error.message, code: error.code, details: error },
        { status: 500 }
      );
    }

    console.log('Mastery score saved successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Mastery score error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mastery-scores?userId=xxx
 * Get mastery scores for a user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const subject = searchParams.get('subject');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('mastery_scores')
      .select('*')
      .eq('user_id', userId);

    if (subject) query = query.eq('subject', subject);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
