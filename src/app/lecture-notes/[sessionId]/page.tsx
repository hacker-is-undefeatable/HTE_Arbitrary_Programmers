'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
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
  media_file_name: string | null;
  media_mime_type: string | null;
  notes_url: string | null;
  notes_file_name: string | null;
  notes_mime_type: string | null;
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
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [showFlashcardBack, setShowFlashcardBack] = useState(false);
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

  useEffect(() => {
    if (activeTab !== 'generated-flashcards') {
      setShowFlashcardBack(false);
      return;
    }

    setFlashcardIndex(0);
    setShowFlashcardBack(false);
  }, [activeTab, session?.id]);

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
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center whitespace-nowrap rounded-sm px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Link>
            <div className="inline-flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
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
        </div>
      }
    >
      <div className="mx-auto max-w-4xl space-y-6">
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
                <CardContent className="space-y-6 text-sm">
                  <div className="space-y-2">
                    <p className="font-medium">Media File</p>
                    {session.media_url ? (
                      <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">
                          {session.media_file_name || 'Uploaded media'}
                        </p>
                        {session.media_mime_type?.startsWith('video/') ? (
                          <video controls className="max-h-[340px] w-full rounded-md" src={session.media_url} />
                        ) : session.media_mime_type?.startsWith('audio/') ? (
                          <audio controls className="w-full" src={session.media_url} />
                        ) : (
                          <p className="text-muted-foreground">Preview not available for this media format.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No media file saved.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium">Notes File</p>
                    {session.notes_url ? (
                      <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">
                          {session.notes_file_name || 'Uploaded notes'}
                        </p>
                        {session.notes_mime_type === 'application/pdf' ? (
                          <iframe
                            src={session.notes_url}
                            title="Lecture notes preview"
                            className="h-[420px] w-full rounded-md border bg-background"
                          />
                        ) : session.notes_mime_type?.startsWith('image/') ? (
                          <img
                            src={session.notes_url}
                            alt="Lecture notes preview"
                            className="max-h-[420px] w-full rounded-md object-contain"
                          />
                        ) : (
                          <p className="text-muted-foreground">Preview not available for this notes format.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No notes file saved.</p>
                    )}
                  </div>
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
                <CardContent className="space-y-4">
                  {session.generated_flashcards?.length > 0 ? (
                    (() => {
                      const currentFlashcard = session.generated_flashcards[flashcardIndex];
                      return (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Card {flashcardIndex + 1} of {session.generated_flashcards.length}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowFlashcardBack((prev) => !prev)}
                            className="w-full"
                          >
                            <div className="[perspective:1200px]">
                              <div
                                className="relative h-[260px] w-full transition-transform duration-500"
                                style={{
                                  transformStyle: 'preserve-3d',
                                  transform: showFlashcardBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
                                }}
                              >
                                <div
                                  className="absolute inset-0 flex flex-col items-center justify-center rounded-md border bg-muted/20 p-8 text-center"
                                  style={{ backfaceVisibility: 'hidden' }}
                                >
                                  <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Front</p>
                                  <p className="text-base font-medium">{currentFlashcard.front}</p>
                                  <p className="mt-4 text-xs text-muted-foreground">Click card to flip</p>
                                </div>

                                <div
                                  className="absolute inset-0 flex flex-col items-center justify-center rounded-md border bg-muted/30 p-8 text-center"
                                  style={{
                                    backfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)',
                                  }}
                                >
                                  <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Back</p>
                                  <p className="text-base font-medium">{currentFlashcard.back}</p>
                                  <p className="mt-4 text-xs text-muted-foreground">Click card to flip</p>
                                </div>
                              </div>
                            </div>
                          </button>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="flex-1"
                              disabled={flashcardIndex === 0}
                              onClick={() => {
                                setFlashcardIndex((prev) => prev - 1);
                                setShowFlashcardBack(false);
                              }}
                            >
                              Previous
                            </Button>
                            <Button
                              className="flex-1"
                              disabled={flashcardIndex === session.generated_flashcards.length - 1}
                              onClick={() => {
                                setFlashcardIndex((prev) => prev + 1);
                                setShowFlashcardBack(false);
                              }}
                            >
                              Next
                            </Button>
                          </div>
                        </>
                      );
                    })()
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
