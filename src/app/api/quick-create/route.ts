import { NextRequest, NextResponse } from 'next/server';
import { AssemblyAI } from 'assemblyai';
import {
  generateLectureFlashcards,
  generateLectureQuizzes,
  summarizeLectureFromTranscript,
} from '@/utils/aiService';
import { createServerClient } from '@/utils/supabase';
import { isS3Configured, S3ConfigError, uploadFileToS3 } from '@/utils/awsStorage';

async function readTextFile(file: File | null): Promise<string> {
  if (!file) return '';

  const fileName = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');

  if (isPdf) {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await pdfParse(buffer);
      return parsed?.text?.trim() || '';
    } catch {
      return '';
    }
  }

  const plainTextTypes = ['text/plain', 'text/markdown', 'application/json'];
  const isPlainTextType = plainTextTypes.includes(file.type);
  const isPlainTextExtension = ['.txt', '.md', '.json'].some((ext) => fileName.endsWith(ext));

  if (!isPlainTextType && !isPlainTextExtension) {
    return '';
  }

  try {
    return await file.text();
  } catch {
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const formData = await request.formData();

    const userId = String(formData.get('userId') || '').trim();
    const lectureTitle = String(formData.get('lectureTitle') || 'Untitled Lecture').trim();
    const notesText = String(formData.get('notesText') || '').trim();
    const mediaFile = formData.get('mediaFile') as File | null;
    const notesFile = formData.get('notesFile') as File | null;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!mediaFile && !notesText && !notesFile) {
      return NextResponse.json(
        { error: 'Please upload a lecture video/audio or provide notes.' },
        { status: 400 }
      );
    }

    let transcriptText = '';
    let mediaMessage = 'No media uploaded. Summary generated from notes only.';
    let mediaUrl: string | null = null;
    let notesUrl: string | null = null;
    const warnings: string[] = [];

    const canUploadToS3 = isS3Configured();
    if (!canUploadToS3) {
      warnings.push('AWS S3 is not configured. Uploaded files are processed but not stored in S3.');
    }

    if (mediaFile && canUploadToS3) {
      const folder = mediaFile.type.startsWith('video/') ? 'videos' : 'audio';
      try {
        mediaUrl = await uploadFileToS3({ userId, file: mediaFile, folder });
      } catch (error) {
        if (error instanceof S3ConfigError) {
          warnings.push('Media file was processed but could not be uploaded to S3.');
        } else {
          throw error;
        }
      }
    }

    if (notesFile && canUploadToS3) {
      try {
        notesUrl = await uploadFileToS3({ userId, file: notesFile, folder: 'notes' });
      } catch (error) {
        if (error instanceof S3ConfigError) {
          warnings.push('Notes file was processed but could not be uploaded to S3.');
        } else {
          throw error;
        }
      }
    }

    if (mediaFile) {
      if (!process.env.ASSEMBLYAI_API_KEY) {
        return NextResponse.json(
          { error: 'Missing ASSEMBLYAI_API_KEY in environment variables.' },
          { status: 500 }
        );
      }

      const assembly = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
      const mediaBuffer = Buffer.from(await mediaFile.arrayBuffer());

      const uploadedMediaUrl = await assembly.files.upload(mediaBuffer);

      const transcript = await assembly.transcripts.transcribe({
        audio: uploadedMediaUrl,
        language_detection: true,
        speech_models: ['universal-3-pro', 'universal-2'],
      });

      transcriptText = transcript.text || '';

      if (!transcriptText) {
        return NextResponse.json(
          { error: 'Transcription completed but no transcript text was returned.' },
          { status: 502 }
        );
      }

      mediaMessage = mediaFile.type.startsWith('video/')
        ? 'Video uploaded and transcribed (AssemblyAI handles media audio extraction).'
        : 'Audio uploaded and transcribed successfully.';
    }

    const extractedNotesFromFile = await readTextFile(notesFile);
    const combinedNotes = [notesText, extractedNotesFromFile].filter(Boolean).join('\n\n');

    const summary = await summarizeLectureFromTranscript(lectureTitle, transcriptText, combinedNotes);

    const generatedQuizzes = await generateLectureQuizzes(lectureTitle, transcriptText, summary, 5);
    const generatedFlashcards = await generateLectureFlashcards(lectureTitle, transcriptText, summary, 8);

    // Ensure profile exists so lecture_sessions.user_id FK is satisfied (profiles are created in Settings; user may not have visited yet)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (!existingProfile) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        role: 'college',
        name: null,
        learning_goal: null,
        preferred_explanation_style: 'step-by-step',
      });
      if (profileError) {
        console.error('Quick create: failed to ensure profile exists:', profileError);
        return NextResponse.json(
          { error: 'Could not ensure user profile. Please complete your profile in Settings first.' },
          { status: 400 }
        );
      }
    }

    const { data: session, error: sessionError } = await supabase
      .from('lecture_sessions')
      .insert([
        {
          user_id: userId,
          lecture_title: lectureTitle,
          media_url: mediaUrl,
          media_file_name: mediaFile?.name || null,
          media_mime_type: mediaFile?.type || null,
          notes_url: notesUrl,
          notes_file_name: notesFile?.name || null,
          notes_mime_type: notesFile?.type || null,
          notes_text: combinedNotes || null,
          transcript: transcriptText || null,
          summary: summary || null,
          updated_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: sessionError?.message || 'Failed to store lecture session' },
        { status: 500 }
      );
    }

    if (generatedQuizzes.length > 0) {
      const quizRows = generatedQuizzes.map((item) => ({
        session_id: session.id,
        user_id: userId,
        question: item.question,
        options: item.options,
        correct_answer: item.correct_answer,
        explanation: item.explanation,
      }));

      const { error: quizError } = await supabase.from('generated_quizzes').insert(quizRows);
      if (quizError) {
        console.error('Failed to store generated quizzes:', quizError);
      }
    }

    if (generatedFlashcards.length > 0) {
      const flashcardRows = generatedFlashcards.map((item) => ({
        session_id: session.id,
        user_id: userId,
        front: item.front,
        back: item.back,
      }));

      const { error: flashcardError } = await supabase
        .from('generated_flashcards')
        .insert(flashcardRows);
      if (flashcardError) {
        console.error('Failed to store generated flashcards:', flashcardError);
      }
    }

    return NextResponse.json({
      sessionId: session.id,
      lectureTitle,
      transcript: transcriptText,
      summary,
      mediaMessage,
      notesDetected: Boolean(combinedNotes),
      mediaUrl,
      notesUrl,
      warnings,
      quizzes: generatedQuizzes,
      flashcards: generatedFlashcards,
    });
  } catch (error) {
    console.error('Quick create processing error:', error);
    const detail = error instanceof Error ? error.message : 'Unknown error';
    const isDev = process.env.NODE_ENV !== 'production';

    return NextResponse.json(
      {
        error: 'Failed to process lecture materials.',
        ...(isDev ? { detail } : {}),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('lecture_sessions')
      .select(
        `
          *,
          generated_quizzes(*),
          generated_flashcards(*)
        `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Quick create history error:', error);
    return NextResponse.json({ error: 'Failed to fetch session history.' }, { status: 500 });
  }
}

/** Returns lecture session metadata for quiz battle question generation. Used by quiz API. */
export async function getLectureSessionForQuiz(sessionId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('lecture_sessions')
    .select('id, lecture_title, notes_text, transcript, summary, created_at')
    .eq('id', sessionId)
    .single();
  if (error || !data) return null;
  return data as {
    id: string;
    lecture_title: string;
    notes_text: string | null;
    transcript: string | null;
    summary: string | null;
    created_at: string;
  };
}
