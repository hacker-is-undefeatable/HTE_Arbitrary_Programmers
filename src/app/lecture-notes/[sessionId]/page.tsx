'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MathText } from '@/components/math-text';
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

type QuizAttemptRow = {
  id: string;
  attempt_id?: string | null;
  session_id?: string | null;
  question: string;
  options?: string[] | null;
  user_answer: string;
  correct_answer: string;
  explanation?: string | null;
  is_correct: boolean;
  total_questions?: number | null;
  correct_count?: number | null;
  timestamp: string;
};

type QuizAttemptDetail = {
  id: string;
  question: string;
  options: string[];
  userAnswer: string;
  correctAnswer: string;
  explanation: string | null;
  isCorrect: boolean;
};

type QuizAttemptSummary = {
  id: string;
  timestamp: string;
  score: number;
  total: number;
  details: QuizAttemptDetail[];
};

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function isCorrectGeneratedOption(option: string, optionIndex: number, correctAnswer: string) {
  const normalizedCorrect = normalizeText(correctAnswer);
  const normalizedOption = normalizeText(option);
  const optionKey = OPTION_KEYS[optionIndex];

  if (normalizedCorrect === normalizedOption) return true;
  if (optionKey && normalizedCorrect === optionKey.toLowerCase()) return true;
  if (optionKey && normalizedCorrect.startsWith(`${optionKey.toLowerCase()})`)) return true;
  if (optionKey && normalizedCorrect.startsWith(`${optionKey.toLowerCase()}.`)) return true;
  if (optionKey && normalizedCorrect.startsWith(`${optionKey.toLowerCase()}:`)) return true;
  return false;
}

function getOptionDisplay(option: string, optionIndex: number) {
  const match = option.match(/^\s*([A-Da-d])[\)\.:]\s*(.*)$/);
  if (match) {
    return {
      label: match[1].toUpperCase(),
      text: match[2] || option,
    };
  }

  return {
    label: OPTION_KEYS[optionIndex] ?? String(optionIndex + 1),
    text: option,
  };
}

function inferLectureQuizSubject(title: string): 'math' | 'python' {
  const normalized = title.toLowerCase();
  const mathKeywords = ['math', 'algebra', 'geometry', 'calculus', 'trigonometry', 'statistics'];
  return mathKeywords.some((keyword) => normalized.includes(keyword)) ? 'math' : 'python';
}

function isMatchingAttemptOption(option: string, optionIndex: number, answer: string) {
  const normalizedAnswer = normalizeText(answer || '');
  if (!normalizedAnswer) return false;
  return isCorrectGeneratedOption(option, optionIndex, answer);
}

function buildQuizAttemptSummaries(rows: QuizAttemptRow[]): QuizAttemptSummary[] {
  const grouped = new Map<string, QuizAttemptRow[]>();

  rows.forEach((row) => {
    const groupKey = row.attempt_id || `${row.session_id || 'session'}-${row.timestamp}`;
    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey)?.push(row);
  });

  return Array.from(grouped.entries())
    .map(([attemptId, groupedRows]) => {
      const score = groupedRows.reduce((sum, row) => (row.is_correct ? sum + 1 : sum), 0);
      const total = groupedRows[0]?.total_questions ?? groupedRows.length;
      const timestamp = groupedRows[0]?.timestamp ?? new Date().toISOString();

      return {
        id: attemptId,
        timestamp,
        score,
        total,
        details: groupedRows.map((row) => ({
          id: row.id,
          question: row.question,
          options: Array.isArray(row.options) ? row.options.map((item) => String(item)) : [],
          userAnswer: row.user_answer,
          correctAnswer: row.correct_answer,
          explanation: row.explanation ?? null,
          isCorrect: row.is_correct,
        })),
      };
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

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
  const [generatedQuizIndex, setGeneratedQuizIndex] = useState(0);
  const [generatedQuizAnswers, setGeneratedQuizAnswers] = useState<Record<number, number>>({});
  const [generatedQuizSubmitted, setGeneratedQuizSubmitted] = useState(false);
  const [generatedQuizSaveStatus, setGeneratedQuizSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [generatedQuizSaveMessage, setGeneratedQuizSaveMessage] = useState('');
  const [generatedQuizGenerationStatus, setGeneratedQuizGenerationStatus] = useState<
    'idle' | 'generating' | 'generated' | 'error'
  >('idle');
  const [generatedQuizGenerationMessage, setGeneratedQuizGenerationMessage] = useState('');
  const [pastQuizAttempts, setPastQuizAttempts] = useState<QuizAttemptSummary[]>([]);
  const [selectedQuizAttemptId, setSelectedQuizAttemptId] = useState<string | null>(null);
  const [loadingPastQuizAttempts, setLoadingPastQuizAttempts] = useState(false);
  const lastScrollYRef = useRef(0);

  const sectionTabs = [
    { key: 'uploaded-files', label: 'Uploaded Files' },
    { key: 'ai-summary', label: 'AI Summary' },
    { key: 'transcript', label: 'Transcript' },
    { key: 'generated-quizzes', label: 'Generated Quizzes' },
    { key: 'quiz-history', label: 'Quiz History' },
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

  useEffect(() => {
    const loadPastQuizAttempts = async () => {
      if (!user?.id || !session?.id) {
        setPastQuizAttempts([]);
        return;
      }

      setLoadingPastQuizAttempts(true);
      try {
        const response = await fetch(
          `/api/quiz-attempts?userId=${user.id}&sessionId=${session.id}&quizSource=lecture-generated`
        );
        const data: QuizAttemptRow[] = await response.json();

        if (!response.ok) {
          throw new Error('Failed to load past quiz attempts.');
        }

        const summaries = buildQuizAttemptSummaries(Array.isArray(data) ? data : []);
        setPastQuizAttempts(summaries);
        setSelectedQuizAttemptId((prev) => prev ?? summaries[0]?.id ?? null);
      } catch {
        setPastQuizAttempts([]);
        setSelectedQuizAttemptId(null);
      } finally {
        setLoadingPastQuizAttempts(false);
      }
    };

    loadPastQuizAttempts();
  }, [user?.id, session?.id, generatedQuizSubmitted]);

  useEffect(() => {
    if (activeTab !== 'generated-quizzes') return;
    setGeneratedQuizIndex(0);
    setGeneratedQuizAnswers({});
    setGeneratedQuizSubmitted(false);
    setGeneratedQuizSaveStatus('idle');
    setGeneratedQuizSaveMessage('');
  }, [activeTab, session?.id]);

  const generatedQuizzes = session?.generated_quizzes ?? [];

  const generatedQuizAllAnswered = useMemo(() => {
    if (generatedQuizzes.length === 0) return false;
    return generatedQuizzes.every((_, index) => typeof generatedQuizAnswers[index] === 'number');
  }, [generatedQuizzes, generatedQuizAnswers]);

  const generatedQuizScore = useMemo(() => {
    if (generatedQuizzes.length === 0) return 0;

    return generatedQuizzes.reduce((score, quiz, index) => {
      const selectedOptionIndex = generatedQuizAnswers[index];
      if (typeof selectedOptionIndex !== 'number') return score;

      const selectedOption = quiz.options[selectedOptionIndex] ?? '';
      const isCorrect = isCorrectGeneratedOption(
        selectedOption,
        selectedOptionIndex,
        quiz.correct_answer
      );
      return isCorrect ? score + 1 : score;
    }, 0);
  }, [generatedQuizzes, generatedQuizAnswers]);

  const handleGeneratedQuizOptionSelect = (optionIndex: number) => {
    if (generatedQuizSubmitted) return;
    setGeneratedQuizAnswers((prev) => ({ ...prev, [generatedQuizIndex]: optionIndex }));
  };

  const handleGeneratedQuizSubmit = async () => {
    if (!session || generatedQuizzes.length === 0 || !generatedQuizAllAnswered || generatedQuizSubmitted) {
      return;
    }

    setGeneratedQuizSubmitted(true);
    setGeneratedQuizSaveStatus('saving');
    setGeneratedQuizSaveMessage('Saving quiz result...');

    try {
      if (user?.id) {
        const subject = inferLectureQuizSubject(session.lecture_title || '');
        const topic = session.lecture_title || 'Lecture Generated Quiz';
        const attemptId =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const saveAttempts = generatedQuizzes.map(async (quiz, index) => {
          const selectedOptionIndex = generatedQuizAnswers[index];
          const selectedAnswer =
            typeof selectedOptionIndex === 'number' ? quiz.options[selectedOptionIndex] : '';
          const isCorrect =
            typeof selectedOptionIndex === 'number'
              ? isCorrectGeneratedOption(selectedAnswer, selectedOptionIndex, quiz.correct_answer)
              : false;

          const response = await fetch('/api/quiz-attempts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              subject,
              topic,
              attemptId,
              sessionId: session.id,
              totalQuestions: generatedQuizzes.length,
              correctCount: generatedQuizScore,
              quizSource: 'lecture-generated',
              question: quiz.question,
              options: quiz.options,
              userAnswer: selectedAnswer,
              correctAnswer: quiz.correct_answer,
              explanation: quiz.explanation,
              isCorrect,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to save quiz attempt');
          }
        });

        const attemptResponses = await Promise.allSettled(saveAttempts);
        const failedAttempts = attemptResponses.filter((result) => result.status === 'rejected').length;

        if (failedAttempts > 0) {
          setGeneratedQuizSaveStatus('error');
          setGeneratedQuizSaveMessage(
            `Quiz submitted. ${failedAttempts} result record(s) failed to save to server.`
          );
          return;
        }
      }

      setGeneratedQuizSaveStatus('saved');
      setGeneratedQuizSaveMessage('Quiz submitted and results saved successfully.');
      if (user?.id && session?.id) {
        const refreshResponse = await fetch(
          `/api/quiz-attempts?userId=${user.id}&sessionId=${session.id}&quizSource=lecture-generated`
        );
        const refreshData: QuizAttemptRow[] = await refreshResponse.json();
        if (refreshResponse.ok) {
          const summaries = buildQuizAttemptSummaries(Array.isArray(refreshData) ? refreshData : []);
          setPastQuizAttempts(summaries);
          setSelectedQuizAttemptId(summaries[0]?.id ?? null);
        }
      }
    } catch {
      setGeneratedQuizSaveStatus('error');
      setGeneratedQuizSaveMessage('Quiz submitted, but saving results failed.');
    }
  };

  const handleRegenerateGeneratedQuiz = async () => {
    if (!session?.id || !user?.id) {
      setGeneratedQuizGenerationStatus('error');
      setGeneratedQuizGenerationMessage('Unable to generate quiz for this session.');
      return;
    }

    setGeneratedQuizGenerationStatus('generating');
    setGeneratedQuizGenerationMessage('Generating a new quiz...');

    try {
      const response = await fetch('/api/lecture-quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          sessionId: session.id,
          count: 5,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to generate quiz.');
      }

      const regeneratedQuizzes: QuizItem[] = Array.isArray(data?.quizzes) ? data.quizzes : [];

      if (!regeneratedQuizzes.length) {
        throw new Error('No quiz questions were generated.');
      }

      setSession((prev) =>
        prev
          ? {
              ...prev,
              generated_quizzes: regeneratedQuizzes,
            }
          : prev
      );

      setGeneratedQuizIndex(0);
      setGeneratedQuizAnswers({});
      setGeneratedQuizSubmitted(false);
      setGeneratedQuizSaveStatus('idle');
      setGeneratedQuizSaveMessage('');
      setGeneratedQuizGenerationStatus('generated');
      setGeneratedQuizGenerationMessage('New quiz generated successfully.');
    } catch (generationError) {
      setGeneratedQuizGenerationStatus('error');
      setGeneratedQuizGenerationMessage(
        generationError instanceof Error ? generationError.message : 'Failed to generate quiz.'
      );
    }
  };

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
                  <CardDescription>
                    Answer each question one-by-one, then submit to see your score.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {generatedQuizzes.length > 0 ? (
                    (() => {
                      const currentQuiz = generatedQuizzes[generatedQuizIndex];
                      const selectedOptionIndex = generatedQuizAnswers[generatedQuizIndex];

                      return (
                        <div className="space-y-4 rounded-md border bg-muted/20 p-4">
                          <p className="text-sm text-muted-foreground">
                            Question {generatedQuizIndex + 1} of {generatedQuizzes.length}
                          </p>

                          <p className="font-medium">
                            <span className="mr-2 font-semibold text-muted-foreground">
                              Q{generatedQuizIndex + 1}.
                            </span>
                            <MathText>{currentQuiz.question}</MathText>
                          </p>

                          <div className="grid gap-2 sm:grid-cols-2">
                            {currentQuiz.options.map((option, optionIndex) => {
                              const { label, text } = getOptionDisplay(option, optionIndex);
                              const isSelected = selectedOptionIndex === optionIndex;
                              const isCorrect = isCorrectGeneratedOption(
                                option,
                                optionIndex,
                                currentQuiz.correct_answer
                              );

                              let optionClass = 'border-border hover:bg-muted/50';

                              if (!generatedQuizSubmitted && isSelected) {
                                optionClass = 'border-primary bg-primary/5';
                              }

                              if (generatedQuizSubmitted && isCorrect) {
                                optionClass = 'border-green-500 bg-green-50';
                              } else if (generatedQuizSubmitted && isSelected && !isCorrect) {
                                optionClass = 'border-red-400 bg-red-50';
                              }

                              return (
                                <button
                                  key={`${option}-${optionIndex}`}
                                  type="button"
                                  onClick={() => handleGeneratedQuizOptionSelect(optionIndex)}
                                  disabled={generatedQuizSubmitted}
                                  className={`flex items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${optionClass}`}
                                >
                                  <span className="mt-0.5 font-semibold">{label})</span>
                                  <MathText>{text}</MathText>
                                  {generatedQuizSubmitted && isCorrect && (
                                    <span className="ml-auto text-xs font-medium text-green-700">Correct</span>
                                  )}
                                  {generatedQuizSubmitted && isSelected && !isCorrect && (
                                    <span className="ml-auto text-xs font-medium text-red-600">Your answer</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {generatedQuizSubmitted && (
                            <div className="rounded-md border bg-background p-3 text-sm">
                              <p>
                                <span className="font-semibold">Correct Answer:</span>{' '}
                                <MathText>{currentQuiz.correct_answer}</MathText>
                              </p>
                              <p className="mt-2">
                                <span className="font-semibold">Explanation:</span>{' '}
                                <MathText>{currentQuiz.explanation}</MathText>
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                disabled={generatedQuizIndex === 0}
                                onClick={() =>
                                  setGeneratedQuizIndex((prev) => Math.max(0, prev - 1))
                                }
                              >
                                Previous
                              </Button>
                              <Button
                                variant="outline"
                                disabled={generatedQuizIndex === generatedQuizzes.length - 1}
                                onClick={() =>
                                  setGeneratedQuizIndex((prev) =>
                                    Math.min(generatedQuizzes.length - 1, prev + 1)
                                  )
                                }
                              >
                                Next
                              </Button>
                            </div>

                            {!generatedQuizSubmitted ? (
                              <Button
                                onClick={handleGeneratedQuizSubmit}
                                disabled={!generatedQuizAllAnswered || generatedQuizSaveStatus === 'saving'}
                              >
                                Submit Quiz
                              </Button>
                            ) : (
                                <Button
                                  variant="outline"
                                  onClick={handleRegenerateGeneratedQuiz}
                                  disabled={generatedQuizGenerationStatus === 'generating'}
                                >
                                  {generatedQuizGenerationStatus === 'generating'
                                    ? 'Generating Quiz...'
                                    : 'Generate Quiz'}
                              </Button>
                            )}
                          </div>

                          {!generatedQuizAllAnswered && !generatedQuizSubmitted && (
                            <p className="text-sm text-muted-foreground">
                              Please answer all questions before submitting.
                            </p>
                          )}

                          {generatedQuizSubmitted && (
                            <div className="rounded-md border bg-background p-3 text-sm">
                              <p>
                                <span className="font-semibold">Result:</span> {generatedQuizScore}/
                                {generatedQuizzes.length} ({((generatedQuizScore / generatedQuizzes.length) * 100).toFixed(0)}%)
                              </p>
                              {generatedQuizSaveMessage && (
                                <p
                                  className={`mt-2 ${
                                    generatedQuizSaveStatus === 'error'
                                      ? 'text-red-600'
                                      : generatedQuizSaveStatus === 'saved'
                                        ? 'text-green-700'
                                        : 'text-muted-foreground'
                                  }`}
                                >
                                  {generatedQuizSaveMessage}
                                </p>
                              )}
                                {generatedQuizGenerationMessage && (
                                  <p
                                    className={`mt-2 ${
                                      generatedQuizGenerationStatus === 'error'
                                        ? 'text-red-600'
                                        : generatedQuizGenerationStatus === 'generated'
                                          ? 'text-green-700'
                                          : 'text-muted-foreground'
                                    }`}
                                  >
                                    {generatedQuizGenerationMessage}
                                  </p>
                                )}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-sm text-muted-foreground">No quizzes generated.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'quiz-history' && (
              <Card>
                <CardHeader>
                  <CardTitle>Quiz History</CardTitle>
                  <CardDescription>
                    Click an attempt to view selected answers and explanations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingPastQuizAttempts ? (
                    <p className="text-sm text-muted-foreground">Loading quiz history...</p>
                  ) : pastQuizAttempts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No past quiz attempts yet.</p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {pastQuizAttempts.map((attempt, index) => (
                          <button
                            key={attempt.id}
                            type="button"
                            onClick={() => setSelectedQuizAttemptId(attempt.id)}
                            className={`w-full rounded-md border p-3 text-left text-sm transition-colors ${
                              selectedQuizAttemptId === attempt.id
                                ? 'border-primary bg-primary/5'
                                : 'bg-muted/20 hover:bg-muted/40'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium">Attempt {pastQuizAttempts.length - index}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(attempt.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <p className="mt-1">
                              <span className="font-semibold">Marks:</span> {attempt.score}/{attempt.total} ({((attempt.score / attempt.total) * 100).toFixed(0)}%)
                            </p>
                          </button>
                        ))}
                      </div>

                      {(() => {
                        const selectedAttempt = pastQuizAttempts.find(
                          (attempt) => attempt.id === selectedQuizAttemptId
                        );

                        if (!selectedAttempt) return null;

                        return (
                          <div className="space-y-3 rounded-md border bg-background p-3">
                            <p className="text-sm font-semibold">Attempt Details</p>
                            {selectedAttempt.details.map((detail, detailIndex) => (
                              <div
                                key={detail.id}
                                className="space-y-4 rounded-md border bg-muted/20 p-4 text-sm"
                              >
                                {(() => {
                                  const fallbackExplanation = generatedQuizzes.find(
                                    (quiz) => normalizeText(quiz.question) === normalizeText(detail.question)
                                  )?.explanation;
                                  const resolvedExplanation =
                                    (detail.explanation || '').trim() ||
                                    (fallbackExplanation || '').trim() ||
                                    'No explanation available.';

                                  return (
                                    <>
                                <p className="font-medium">
                                  <span className="mr-2 font-semibold text-muted-foreground">Q{detailIndex + 1}.</span>
                                  <MathText>{detail.question}</MathText>
                                </p>

                                {detail.options.length > 0 ? (
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    {detail.options.map((option, optionIndex) => {
                                      const { label, text } = getOptionDisplay(option, optionIndex);
                                      const isCorrect = isCorrectGeneratedOption(
                                        option,
                                        optionIndex,
                                        detail.correctAnswer
                                      );
                                      const isSelected = isMatchingAttemptOption(
                                        option,
                                        optionIndex,
                                        detail.userAnswer
                                      );

                                      let optionClass = 'border-border';
                                      if (isCorrect) {
                                        optionClass = 'border-green-500 bg-green-50';
                                      } else if (isSelected && !isCorrect) {
                                        optionClass = 'border-red-400 bg-red-50';
                                      }

                                      return (
                                        <div
                                          key={`${detail.id}-${option}-${optionIndex}`}
                                          className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${optionClass}`}
                                        >
                                          <span className="mt-0.5 font-semibold">{label})</span>
                                          <MathText>{text}</MathText>
                                          {isCorrect && (
                                            <span className="ml-auto text-xs font-medium text-green-700">Correct</span>
                                          )}
                                          {isSelected && !isCorrect && (
                                            <span className="ml-auto text-xs font-medium text-red-600">Your answer</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="rounded-md border bg-background p-3">
                                    <p>
                                      <span className="font-semibold">Your Answer:</span>{' '}
                                      <MathText>{detail.userAnswer || 'No answer selected'}</MathText>
                                    </p>
                                    <p className="mt-1">
                                      <span className="font-semibold">Correct Answer:</span>{' '}
                                      <MathText>{detail.correctAnswer}</MathText>
                                    </p>
                                  </div>
                                )}

                                <div className="rounded-md border bg-background p-3 text-sm">
                                  <p>
                                    <span className="font-semibold">Result:</span>{' '}
                                    <span className={detail.isCorrect ? 'text-green-700' : 'text-red-700'}>
                                      {detail.isCorrect ? 'Correct' : 'Incorrect'}
                                    </span>
                                  </p>
                                  <p className="mt-2">
                                    <span className="font-semibold">Explanation:</span>{' '}
                                    <MathText>{resolvedExplanation}</MathText>
                                  </p>
                                </div>
                                    </>
                                  );
                                })()}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </>
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
