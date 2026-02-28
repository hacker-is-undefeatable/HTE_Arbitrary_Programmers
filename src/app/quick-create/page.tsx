'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import BoardingPass from '@/components/boarding-pass';
import { Checkpoint } from '@/types/flight';
import { buildLectureCheckpoints } from '@/utils/flightTicketEngine';

type QuizItem = {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
};

type FlashcardItem = {
  front: string;
  back: string;
};

type SessionItem = {
  id: string;
  lecture_title: string;
  summary: string | null;
  transcript: string | null;
  media_url: string | null;
  notes_url: string | null;
  created_at: string;
  generated_quizzes: QuizItem[];
  generated_flashcards: FlashcardItem[];
};

export default function QuickCreatePage() {
  const { user } = useAuth();
  const [lectureTitle, setLectureTitle] = useState('');
  const [notesText, setNotesText] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [notesFile, setNotesFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    transcript: string;
    summary: string;
    mediaMessage?: string;
    quizzes: QuizItem[];
    flashcards: FlashcardItem[];
  } | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const checkpoints = useMemo<Checkpoint[]>(() => {
    if (!result) return [];

    return buildLectureCheckpoints(result.summary, result.quizzes, result.flashcards);
  }, [result]);

  const loadSessionHistory = async () => {
    if (!user?.id) return;

    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/quick-create?userId=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load history');
      }

      setSessionHistory(data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadSessionHistory();
  }, [user?.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      if (!user?.id) {
        throw new Error('You must be logged in to create a session.');
      }

      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('lectureTitle', lectureTitle || 'Untitled Lecture');
      formData.append('notesText', notesText);

      if (mediaFile) formData.append('mediaFile', mediaFile);
      if (notesFile) formData.append('notesFile', notesFile);

      const response = await fetch('/api/quick-create', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Processing failed');
      }

      setResult({
        transcript: data.transcript || '',
        summary: data.summary || '',
        mediaMessage: data.mediaMessage,
        quizzes: data.quizzes || [],
        flashcards: data.flashcards || [],
      });

      await loadSessionHistory();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Quick Create" subtitle="Upload lecture materials and generate AI transcript + summary">
      <div className="mx-auto max-w-4xl space-y-6">
        <form onSubmit={handleSubmit}>
          <BoardingPass
            checkpoints={checkpoints}
            actionType="submit"
            actionDisabled={loading}
            actionLabel={loading ? 'Processing with AI...' : 'PROCESS MATERIALS'}
            uploadSection={(
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Lecture Title</label>
                  <Input
                    value={lectureTitle}
                    onChange={(event) => setLectureTitle(event.target.value)}
                    placeholder="e.g., Intro to Linear Algebra"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Lecture Video / Audio</label>
                  <Input
                    type="file"
                    accept="video/*,audio/*"
                    onChange={(event) => setMediaFile(event.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">Supported: MP4, MOV, MP3, WAV, M4A, etc.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Lecture Notes File (optional)</label>
                  <Input
                    type="file"
                    accept=".txt,.md,.json,.pdf,application/pdf"
                    onChange={(event) => setNotesFile(event.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">Supported: TXT, MD, JSON, PDF.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Additional Notes Text (optional)</label>
                  <textarea
                    className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={notesText}
                    onChange={(event) => setNotesText(event.target.value)}
                    placeholder="Paste lecture notes, key points, or context here..."
                  />
                </div>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}
              </>
            )}
          />
        </form>

        {result && (
          <>
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Transcript</CardTitle>
                    <CardDescription>{result.mediaMessage || 'Generated from uploaded media'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[280px] overflow-auto rounded-md border bg-muted/20 p-3 text-sm leading-6">
                      {result.transcript || 'No transcript was produced.'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Lecture Summary</CardTitle>
                    <CardDescription>Generated with Azure AI</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm leading-6">
                      {result.summary || 'No summary was produced.'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Generated Quizzes</CardTitle>
                    <CardDescription>Saved to Supabase for future practice</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.quizzes.length > 0 ? (
                      result.quizzes.map((quiz, index) => (
                        <div key={`${quiz.question}-${index}`} className="rounded-md border bg-muted/20 p-3">
                          <p className="font-medium">Q{index + 1}. {quiz.question}</p>
                          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            {quiz.options.map((option, optionIndex) => (
                              <li key={`${option}-${optionIndex}`}>• {option}</li>
                            ))}
                          </ul>
                          <p className="mt-2 text-sm"><strong>Answer:</strong> {quiz.correct_answer}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No quizzes generated.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Generated Flashcards</CardTitle>
                    <CardDescription>Saved to Supabase for future revision</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.flashcards.length > 0 ? (
                      result.flashcards.map((flashcard, index) => (
                        <div key={`${flashcard.front}-${index}`} className="rounded-md border bg-muted/20 p-3">
                          <p className="font-medium">Front: {flashcard.front}</p>
                          <p className="mt-1 text-sm text-muted-foreground">Back: {flashcard.back}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No flashcards generated.</p>
                    )}
                  </CardContent>
                </Card>
              </>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Session History</CardTitle>
            <CardDescription>Previously processed sessions with stored materials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {historyLoading ? (
              <p className="text-sm text-muted-foreground">Loading history...</p>
            ) : sessionHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved sessions yet.</p>
            ) : (
              sessionHistory.map((session) => (
                <div key={session.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{session.lecture_title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(session.created_at).toLocaleString()}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{session.generated_quizzes?.length || 0} quizzes</span>
                    <span>{session.generated_flashcards?.length || 0} flashcards</span>
                    {session.media_url ? <a href={session.media_url} target="_blank" rel="noreferrer" className="underline">media file</a> : null}
                    {session.notes_url ? <a href={session.notes_url} target="_blank" rel="noreferrer" className="underline">notes file</a> : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
