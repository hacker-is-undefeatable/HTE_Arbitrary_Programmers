'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

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

export default function LectureSessionDetailPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState<SessionItem | null>(null);
  const [showSectionNav, setShowSectionNav] = useState(true);
  const [activeTab, setActiveTab] = useState('uploaded-files');
  const lastScrollYRef = useRef(0);

  const sectionTabs = [
    { key: 'uploaded-files', label: 'Uploaded Files' },
    { key: 'ai-summary', label: 'AI Summary' },
    { key: 'transcript', label: 'Transcript' },
    { key: 'generated-quizzes', label: 'Generated Quizzes' },
    { key: 'generated-flashcards', label: 'Generated Flashcards' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollYRef.current;
      const nearTop = currentScrollY < 80;

      setShowSectionNav(nearTop || !scrollingDown);
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      if (!user?.id || !sessionId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/quick-create?userId=${user.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load lecture session.');
        }

        const sessions: SessionItem[] = Array.isArray(data) ? data : [];
        const targetSession = sessions.find((item) => item.id === sessionId) || null;

        if (!targetSession) {
          setError('Lecture session not found.');
          setSession(null);
        } else {
          setSession(targetSession);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load lecture session.');
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [user?.id, sessionId]);

  const createdAt = useMemo(() => {
    if (!session?.created_at) return '';
    return new Date(session.created_at).toLocaleString();
  }, [session?.created_at]);

  return (
    <AppShell
      title={session?.lecture_title || 'Learning'}
      subtitle={createdAt ? `Created ${createdAt}` : 'View uploaded materials and AI-generated content'}
      outsideTopSlot={
        <div
          className={`sticky top-0 z-30 overflow-x-auto rounded-md border bg-background/95 p-1 backdrop-blur transition-transform duration-200 ${
            showSectionNav ? 'translate-y-0' : '-translate-y-[140%]'
          }`}
        >
          <div className="inline-flex min-w-full items-center gap-1 sm:min-w-max">
            {sectionTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap rounded-sm px-3 py-2 text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-sm text-muted-foreground">
          <Link href="/dashboard" className="underline">
            Back to dashboard
          </Link>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Loading lecture session...</CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-sm text-red-600">{error}</CardContent>
          </Card>
        ) : session ? (
          <>
            {activeTab === 'uploaded-files' && (
              <Card>
                <CardHeader>
                  <CardTitle>Uploaded Files</CardTitle>
                  <CardDescription>Lecture materials uploaded during quick create</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {session.media_url ? (
                    <p>
                      <a href={session.media_url} target="_blank" rel="noreferrer" className="underline">
                        Open media file
                      </a>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">No media file saved.</p>
                  )}

                  {session.notes_url ? (
                    <p>
                      <a href={session.notes_url} target="_blank" rel="noreferrer" className="underline">
                        Open notes file
                      </a>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">No notes file saved.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'ai-summary' && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm leading-6">
                    {session.summary || 'No summary was generated.'}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'transcript' && (
              <Card>
                <CardHeader>
                  <CardTitle>Transcript</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[280px] overflow-auto rounded-md border bg-muted/20 p-3 text-sm leading-6">
                    {session.transcript || 'No transcript was generated.'}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'generated-quizzes' && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Quizzes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {session.generated_quizzes?.length > 0 ? (
                    session.generated_quizzes.map((quiz, index) => (
                      <div key={`${quiz.question}-${index}`} className="rounded-md border bg-muted/20 p-3">
                        <p className="font-medium">
                          Q{index + 1}. {quiz.question}
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {quiz.options.map((option, optionIndex) => (
                            <li key={`${option}-${optionIndex}`}>• {option}</li>
                          ))}
                        </ul>
                        <p className="mt-2 text-sm">
                          <strong>Answer:</strong> {quiz.correct_answer}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No quizzes generated.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'generated-flashcards' && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Flashcards</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {session.generated_flashcards?.length > 0 ? (
                    session.generated_flashcards.map((flashcard, index) => (
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
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
