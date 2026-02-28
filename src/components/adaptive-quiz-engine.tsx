'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MathText } from '@/components/math-text';

type DifficultyLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

type QuizSubject = 'math' | 'ai';

type OptionKey = 'A' | 'B' | 'C' | 'D';

interface MCQ {
  id: string;
  subject: QuizSubject;
  difficulty: DifficultyLevel;
  concept: string;
  question: string;
  options: Record<OptionKey, string>;
  correctOption: OptionKey;
  misconception: string;
  reinforcementTip: string;
}

interface QuestionReview {
  questionId: string;
  concept: string;
  correctOption: OptionKey;
  correctExplanation: string;
  studentOption: OptionKey | null;
  isCorrect: boolean;
  misconception: string | null;
  reinforcementTip: string;
}

interface RoundSummary {
  round: number;
  subject: QuizSubject;
  difficulty: DifficultyLevel;
  score: number;
  accuracy: number;
  weakestConcept: string | null;
  strongestConcept: string | null;
  masterySignal: 'Struggling' | 'Developing' | 'Proficient' | 'Advanced';
  difficultyAdjustment: 'Increase' | 'Maintain' | 'Decrease';
  nextDifficulty: DifficultyLevel;
  rationale: string;
  questionReviews: QuestionReview[];
}

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  L1: 'Recall',
  L2: 'Comprehension',
  L3: 'Application',
  L4: 'Analysis',
  L5: 'Synthesis / Evaluation',
};

const MAX_ROUNDS = 5;
const QUESTIONS_PER_ROUND = 5;

const SESSION_HISTORY_KEY = 'adaptiveQuizSessionHistory';

interface SavedQuestionDetail {
  question: string;
  concept: string;
  options: Record<OptionKey, string>;
  correctOption: OptionKey;
  studentOption: OptionKey | null;
  isCorrect: boolean;
  misconception: string | null;
  reinforcementTip: string;
}

interface SavedRoundDetail {
  round: number;
  difficulty: DifficultyLevel;
  score: number;
  masterySignal: string;
  questions: SavedQuestionDetail[];
}

interface SessionRecord {
  id: string;
  subject: QuizSubject;
  date: string;
  rounds: number;
  totalScore: number;
  totalQuestions: number;
  accuracy: number;
  finalMastery: 'Struggling' | 'Developing' | 'Proficient' | 'Advanced';
  roundBreakdown: { round: number; score: number; difficulty: DifficultyLevel }[];
  roundDetails?: SavedRoundDetail[];
}

async function fetchQuestionsFromAPI(
  subject: QuizSubject,
  difficulty: DifficultyLevel,
  previousQuestions: string[]
): Promise<MCQ[]> {
  const res = await fetch('/api/adaptive-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, difficulty, count: QUESTIONS_PER_ROUND, previousQuestions }),
  });
  if (!res.ok) throw new Error('Failed to generate questions');
  const data = await res.json();
  return (data.questions || []) as MCQ[];
}

function loadSessionHistory(): SessionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SESSION_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SessionRecord[];
  } catch {
    return [];
  }
}

function saveSessionRecord(record: SessionRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadSessionHistory();
    existing.unshift(record);
    const capped = existing.slice(0, 50);
    window.localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(capped));
  } catch (e) {
    console.error('Failed to save session record', e);
  }
}

function getNextDifficulty(current: DifficultyLevel, correctCount: number): {
  adjustment: 'Increase' | 'Maintain' | 'Decrease';
  next: DifficultyLevel;
  step: number;
} {
  const order: DifficultyLevel[] = ['L1', 'L2', 'L3', 'L4', 'L5'];
  const idx = order.indexOf(current);
  const accuracy = (correctCount / QUESTIONS_PER_ROUND) * 100;

  let step = 0;
  if (accuracy === 100) step = 2;
  else if (accuracy >= 80) step = 1;
  else if (accuracy >= 60) step = 0;
  else if (accuracy >= 40) step = -1;
  else step = -2;

  const targetIdx = Math.max(0, Math.min(order.length - 1, idx + step));
  const adjustment: 'Increase' | 'Maintain' | 'Decrease' =
    targetIdx > idx ? 'Increase' : targetIdx < idx ? 'Decrease' : 'Maintain';

  return { adjustment, next: order[targetIdx], step };
}

function getMasterySignal(correctCount: number): 'Struggling' | 'Developing' | 'Proficient' | 'Advanced' {
  const accuracy = (correctCount / QUESTIONS_PER_ROUND) * 100;
  if (accuracy < 40) return 'Struggling';
  if (accuracy < 60) return 'Developing';
  if (accuracy < 80) return 'Proficient';
  return 'Advanced';
}

function buildRoundSummary(
  round: number,
  subject: QuizSubject,
  difficulty: DifficultyLevel,
  questions: MCQ[],
  answers: Record<string, OptionKey | null>
): RoundSummary {
  const reviews: QuestionReview[] = questions.map((q) => {
    const studentOption = answers[q.id] ?? null;
    const isCorrect = studentOption === q.correctOption;

    return {
      questionId: q.id,
      concept: q.concept,
      correctOption: q.correctOption,
      correctExplanation: q.options[q.correctOption],
      studentOption,
      isCorrect,
      misconception: isCorrect ? null : q.misconception,
      reinforcementTip: q.reinforcementTip,
    };
  });

  const score = reviews.filter((r) => r.isCorrect).length;
  const accuracy = (score / QUESTIONS_PER_ROUND) * 100;

  const conceptCounts: Record<string, { correct: number; total: number }> = {};
  reviews.forEach((r) => {
    if (!conceptCounts[r.concept]) {
      conceptCounts[r.concept] = { correct: 0, total: 0 };
    }
    conceptCounts[r.concept].total += 1;
    if (r.isCorrect) conceptCounts[r.concept].correct += 1;
  });

  let weakestConcept: string | null = null;
  let strongestConcept: string | null = null;
  let minAccuracy = Infinity;
  let maxAccuracy = -Infinity;

  Object.entries(conceptCounts).forEach(([concept, stats]) => {
    const conceptAccuracy = (stats.correct / stats.total) * 100;
    if (conceptAccuracy < minAccuracy) {
      minAccuracy = conceptAccuracy;
      weakestConcept = concept;
    }
    if (conceptAccuracy > maxAccuracy) {
      maxAccuracy = conceptAccuracy;
      strongestConcept = concept;
    }
  });

  const masterySignal = getMasterySignal(score);
  const { adjustment, next, step } = getNextDifficulty(difficulty, score);
  const pct = accuracy.toFixed(0);

  let rationale: string;
  if (step >= 2) {
    rationale = `Perfect score (${pct}%) -- jumping up 2 difficulty levels to keep you challenged.`;
  } else if (step === 1) {
    rationale = `Strong accuracy (${pct}%) -- stepping up 1 difficulty level.`;
  } else if (step === 0 && adjustment === 'Maintain') {
    rationale = `Solid accuracy (${pct}%) -- the current difficulty level is a good fit, maintaining it.`;
  } else if (step === -1) {
    rationale = `Below-target accuracy (${pct}%) -- stepping down 1 level to reinforce fundamentals.`;
  } else {
    rationale = `Low accuracy (${pct}%) -- dropping 2 levels to rebuild confidence on core concepts.`;
  }

  return {
    round,
    subject,
    difficulty,
    score,
    accuracy,
    weakestConcept,
    strongestConcept,
    masterySignal,
    difficultyAdjustment: adjustment,
    nextDifficulty: next,
    rationale,
    questionReviews: reviews,
  };
}

function buildSavedRoundDetail(
  summary: RoundSummary,
  questions: MCQ[],
  answers: Record<string, OptionKey | null>
): SavedRoundDetail {
  return {
    round: summary.round,
    difficulty: summary.difficulty,
    score: summary.score,
    masterySignal: summary.masterySignal,
    questions: questions.map((q) => {
      const studentOption = answers[q.id] ?? null;
      const isCorrect = studentOption === q.correctOption;
      return {
        question: q.question,
        concept: q.concept,
        options: q.options,
        correctOption: q.correctOption,
        studentOption,
        isCorrect,
        misconception: isCorrect ? null : q.misconception,
        reinforcementTip: q.reinforcementTip,
      };
    }),
  };
}

function AdaptiveQuiz({ subject, onComplete }: { subject: QuizSubject; onComplete: () => void }) {
  const [round, setRound] = useState(1);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('L2');
  const [currentQuestions, setCurrentQuestions] = useState<MCQ[]>([]);
  const [answers, setAnswers] = useState<Record<string, OptionKey | null>>({});
  const [currentSummary, setCurrentSummary] = useState<RoundSummary | null>(null);
  const [allSummaries, setAllSummaries] = useState<RoundSummary[]>([]);
  const [roundSubmitted, setRoundSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const hasSavedSessionRef = useRef(false);
  const previousQuestionsRef = useRef<string[]>([]);
  const savedRoundsRef = useRef<SavedRoundDetail[]>([]);

  const subjectLabel = subject === 'math' ? 'Math' : 'AI / Machine Learning';

  const currentDifficultyLabel = useMemo(
    () => `${difficulty} -- ${DIFFICULTY_LABELS[difficulty]}`,
    [difficulty]
  );

  const loadRound = useCallback(async (subj: QuizSubject, diff: DifficultyLevel) => {
    setLoading(true);
    setError(null);
    try {
      const questions = await fetchQuestionsFromAPI(subj, diff, previousQuestionsRef.current);
      if (questions.length === 0) throw new Error('No questions returned');
      previousQuestionsRef.current = [
        ...previousQuestionsRef.current,
        ...questions.map((q) => q.question),
      ];
      setCurrentQuestions(questions);
      setSessionReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate questions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setRound(1);
    setDifficulty('L2');
    setAnswers({});
    setCurrentSummary(null);
    setAllSummaries([]);
    setRoundSubmitted(false);
    setSessionReady(false);
    hasSavedSessionRef.current = false;
    previousQuestionsRef.current = [];
    savedRoundsRef.current = [];
    loadRound(subject, 'L2');
  }, [subject, loadRound]);

  const handleOptionChange = (questionId: string, option: OptionKey) => {
    if (roundSubmitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitRound = () => {
    if (roundSubmitted) return;
    const summary = buildRoundSummary(round, subject, difficulty, currentQuestions, answers);
    setCurrentSummary(summary);
    setAllSummaries((prev) => [...prev, summary]);
    setRoundSubmitted(true);

    savedRoundsRef.current = [
      ...savedRoundsRef.current,
      buildSavedRoundDetail(summary, currentQuestions, answers),
    ];
  };

  const handleNextRound = async () => {
    if (!currentSummary) return;
    if (round >= MAX_ROUNDS) return;

    const nextDifficulty = currentSummary.nextDifficulty;
    setRound((r) => r + 1);
    setDifficulty(nextDifficulty);
    setAnswers({});
    setCurrentSummary(null);
    setRoundSubmitted(false);
    await loadRound(subject, nextDifficulty);
  };

  const isSessionComplete = round > MAX_ROUNDS || (round === MAX_ROUNDS && roundSubmitted);

  useEffect(() => {
    if (
      !isSessionComplete ||
      !sessionReady ||
      allSummaries.length === 0 ||
      hasSavedSessionRef.current
    )
      return;
    hasSavedSessionRef.current = true;

    const totalScore = allSummaries.reduce((s, r) => s + r.score, 0);
    const totalQuestions = allSummaries.length * QUESTIONS_PER_ROUND;
    const lastMastery = allSummaries[allSummaries.length - 1].masterySignal;
    saveSessionRecord({
      id: `session-${Date.now()}`,
      subject,
      date: new Date().toISOString(),
      rounds: allSummaries.length,
      totalScore,
      totalQuestions,
      accuracy: totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0,
      finalMastery: lastMastery,
      roundBreakdown: allSummaries.map((s) => ({
        round: s.round,
        score: s.score,
        difficulty: s.difficulty,
      })),
      roundDetails: savedRoundsRef.current,
    });
  }, [isSessionComplete, subject, sessionReady, allSummaries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{subjectLabel} Session</p>
          <p className="text-lg font-semibold">
            Round {Math.min(round, MAX_ROUNDS)} of {MAX_ROUNDS}
          </p>
          <p className="text-sm text-muted-foreground">Difficulty tier: {currentDifficultyLabel}</p>
        </div>
        <div className="text-sm text-muted-foreground">
          5 questions per round -- Adaptive difficulty based on your performance
        </div>
      </div>

      {loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-3 text-muted-foreground">Generating fresh questions with AI...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600 mb-3">{error}</p>
            <Button onClick={() => loadRound(subject, difficulty)}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {sessionReady && !loading && !error && !isSessionComplete && (
        <Card>
          <CardHeader>
            <CardTitle>Round {round} Questions</CardTitle>
            <CardDescription>
              Answer all 5 MCQs. Difficulty will adjust after you submit this round.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentQuestions.map((q, index) => {
              const selected = answers[q.id] ?? null;
              return (
                <div key={q.id} className="space-y-3 border-b last:border-none pb-4 last:pb-0">
                  <p className="font-medium">
                    <span className="mr-2 font-semibold">
                      Q{index + 1}.
                    </span>
                    <MathText>{q.question}</MathText>
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(Object.keys(q.options) as OptionKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleOptionChange(q.id, key)}
                        className={`flex items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                          selected === key
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <span className="mt-0.5 font-semibold">{key})</span>
                        <MathText>{q.options[key]}</MathText>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end">
              <Button
                onClick={handleSubmitRound}
                disabled={
                  roundSubmitted ||
                  currentQuestions.some((q) => (answers[q.id] ?? null) === null)
                }
              >
                {roundSubmitted ? 'Round Submitted' : 'Submit Round'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Round {currentSummary.round} Analysis</CardTitle>
            <CardDescription>
              Structured feedback for each question plus a performance summary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <div className="space-y-4">
              {currentSummary.questionReviews.map((r, idx) => (
                <div key={r.questionId} className="rounded-md border bg-muted/40 p-3">
                  <p className="font-semibold mb-1">
                    Question {idx + 1} Review
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Concept Tested: <span className="font-medium">{r.concept}</span>
                  </p>
                  <p className="mb-1">
                    <span className="font-semibold">Correct Answer:</span>{' '}
                    {r.correctOption}) <MathText>{r.correctExplanation}</MathText>
                  </p>
                  <p className="mb-1">
                    <span className="font-semibold">Student&apos;s Answer:</span>{' '}
                    {r.studentOption ? (
                      <>
                        {r.studentOption}){' '}
                        <MathText>
                          {currentQuestions.find((q) => q.id === r.questionId)?.options[
                            r.studentOption
                          ] ?? ''}
                        </MathText>
                      </>
                    ) : (
                      'No answer selected'
                    )}{' -- '}
                    <span className={r.isCorrect ? 'text-green-700' : 'text-red-700'}>
                      {r.isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </p>
                  {!r.isCorrect && r.misconception && (
                    <p className="mb-1">
                      <span className="font-semibold">Misconception Detected:</span> <MathText>{r.misconception}</MathText>
                    </p>
                  )}
                  <p>
                    <span className="font-semibold">Reinforcement Tip:</span> <MathText>{r.reinforcementTip}</MathText>
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-md border bg-background p-3">
              <p className="font-semibold mb-1">
                Round {currentSummary.round} Performance Summary
              </p>
              <p>
                <span className="font-semibold">Score:</span> {currentSummary.score}/
                {QUESTIONS_PER_ROUND}
              </p>
              <p>
                <span className="font-semibold">Accuracy:</span>{' '}
                {currentSummary.accuracy.toFixed(0)}%
              </p>
              <p>
                <span className="font-semibold">Weakest Concept:</span>{' '}
                {currentSummary.weakestConcept ?? 'N/A'}
              </p>
              <p>
                <span className="font-semibold">Strongest Concept:</span>{' '}
                {currentSummary.strongestConcept ?? 'N/A'}
              </p>
              <p>
                <span className="font-semibold">Overall Mastery Signal:</span>{' '}
                {currentSummary.masterySignal}
              </p>
              <p>
                <span className="font-semibold">Difficulty Adjustment for Next Round:</span>{' '}
                {currentSummary.difficultyAdjustment} to level {currentSummary.nextDifficulty}
              </p>
              <p className="mt-1 text-muted-foreground">{currentSummary.rationale}</p>
            </div>

            {round < MAX_ROUNDS && (
              <div className="flex justify-end">
                <Button onClick={handleNextRound}>Start Next Round</Button>
              </div>
            )}
            {round === MAX_ROUNDS && (
              <div className="flex justify-end gap-3">
                <span className="self-center text-sm font-medium text-green-700">Session Complete</span>
                <Button onClick={onComplete}>Back to Quiz Home</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SessionReview({
  session,
  onBack,
}: {
  session: SessionRecord;
  onBack: () => void;
}) {
  const details = session.roundDetails;
  const hasDetails = details && details.length > 0;
  const wrongOnly = hasDetails
    ? details.flatMap((rd) =>
        rd.questions
          .filter((q) => !q.isCorrect)
          .map((q) => ({ ...q, round: rd.round, difficulty: rd.difficulty }))
      )
    : [];

  const [tab, setTab] = useState<'all' | 'wrong'>('wrong');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          Back to Past Quizzes
        </Button>
        <div>
          <p className="text-lg font-semibold">
            {session.subject === 'math' ? 'Math' : 'AI / ML'} Quiz Review
          </p>
          <p className="text-sm text-muted-foreground">{formatDate(session.date)}</p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-6 py-4 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold">{session.totalScore}/{session.totalQuestions}</p>
            <p className="text-xs text-muted-foreground">Total Score</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{session.accuracy.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{session.rounds}</p>
            <p className="text-xs text-muted-foreground">Rounds</p>
          </div>
          <div className="text-center">
            <span
              className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                MASTERY_COLORS[session.finalMastery] ?? ''
              }`}
            >
              {session.finalMastery}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Mastery</p>
          </div>
        </CardContent>
      </Card>

      {!hasDetails ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Detailed question data is not available for this older session.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="inline-flex rounded-md border bg-muted/40 p-1 text-sm">
            <button
              type="button"
              onClick={() => setTab('wrong')}
              className={`rounded px-4 py-1.5 ${
                tab === 'wrong' ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Wrong Answers ({wrongOnly.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('all')}
              className={`rounded px-4 py-1.5 ${
                tab === 'all' ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground'
              }`}
            >
              All Questions
            </button>
          </div>

          {tab === 'wrong' && (
            <div className="space-y-4">
              {wrongOnly.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    You got every question right in this session -- great job!
                  </CardContent>
                </Card>
              ) : (
                wrongOnly.map((q, idx) => (
                  <Card key={idx}>
                    <CardContent className="py-4 space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded bg-muted px-2 py-0.5 font-medium">
                          Round {q.round}
                        </span>
                        <span>{q.difficulty} -- {DIFFICULTY_LABELS[q.difficulty]}</span>
                        <span className="rounded bg-muted px-2 py-0.5">{q.concept}</span>
                      </div>

                      <p className="font-medium">
                        <MathText>{q.question}</MathText>
                      </p>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {(Object.keys(q.options) as OptionKey[]).map((key) => {
                          let style = 'border-border';
                          if (key === q.correctOption) style = 'border-green-500 bg-green-50';
                          else if (key === q.studentOption) style = 'border-red-400 bg-red-50';
                          return (
                            <div
                              key={key}
                              className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${style}`}
                            >
                              <span className="mt-0.5 font-semibold">{key})</span>
                              <MathText>{q.options[key]}</MathText>
                              {key === q.correctOption && (
                                <span className="ml-auto text-xs font-medium text-green-700">Correct</span>
                              )}
                              {key === q.studentOption && key !== q.correctOption && (
                                <span className="ml-auto text-xs font-medium text-red-600">Your answer</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {q.misconception && (
                        <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                          <p className="font-semibold text-amber-800 mb-1">Misconception</p>
                          <p className="text-amber-900"><MathText>{q.misconception}</MathText></p>
                        </div>
                      )}

                      <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                        <p className="font-semibold text-blue-800 mb-1">Reinforcement Tip</p>
                        <p className="text-blue-900"><MathText>{q.reinforcementTip}</MathText></p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {tab === 'all' && (
            <div className="space-y-6">
              {details.map((rd) => (
                <div key={rd.round} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">Round {rd.round}</h3>
                    <span className="text-xs text-muted-foreground">
                      {rd.difficulty} -- {DIFFICULTY_LABELS[rd.difficulty as DifficultyLevel]}
                    </span>
                    <span className="text-xs font-medium">
                      {rd.score}/{rd.questions.length}
                    </span>
                  </div>

                  {rd.questions.map((q, qIdx) => (
                    <Card key={qIdx} className={q.isCorrect ? '' : 'border-red-200'}>
                      <CardContent className="py-4 space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">
                            <span className="mr-2 font-semibold text-muted-foreground">Q{qIdx + 1}.</span>
                            <MathText>{q.question}</MathText>
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              q.isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {q.isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {(Object.keys(q.options) as OptionKey[]).map((key) => {
                            let style = 'border-border';
                            if (key === q.correctOption) style = 'border-green-500 bg-green-50';
                            else if (key === q.studentOption && !q.isCorrect) style = 'border-red-400 bg-red-50';
                            return (
                              <div
                                key={key}
                                className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${style}`}
                              >
                                <span className="mt-0.5 font-semibold">{key})</span>
                                <MathText>{q.options[key]}</MathText>
                                {key === q.correctOption && (
                                  <span className="ml-auto text-xs font-medium text-green-700">Correct</span>
                                )}
                                {key === q.studentOption && key !== q.correctOption && (
                                  <span className="ml-auto text-xs font-medium text-red-600">Your answer</span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {!q.isCorrect && q.misconception && (
                          <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                            <p className="font-semibold text-amber-800 mb-1">Misconception</p>
                            <p className="text-amber-900"><MathText>{q.misconception}</MathText></p>
                          </div>
                        )}

                        {!q.isCorrect && (
                          <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                            <p className="font-semibold text-blue-800 mb-1">Reinforcement Tip</p>
                            <p className="text-blue-900"><MathText>{q.reinforcementTip}</MathText></p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const MASTERY_COLORS: Record<string, string> = {
  Struggling: 'text-red-600 bg-red-50',
  Developing: 'text-amber-600 bg-amber-50',
  Proficient: 'text-blue-600 bg-blue-50',
  Advanced: 'text-green-600 bg-green-50',
};

export default function AdaptiveQuizEngine() {
  const [view, setView] = useState<'lobby' | 'quiz' | 'review'>('lobby');
  const [selectedSubject, setSelectedSubject] = useState<QuizSubject>('math');
  const [sessionHistory, setSessionHistory] = useState<SessionRecord[]>([]);
  const [reviewSession, setReviewSession] = useState<SessionRecord | null>(null);

  useEffect(() => {
    setSessionHistory(loadSessionHistory());
  }, [view]);

  const handleStartQuiz = () => {
    setView('quiz');
  };

  const handleQuizComplete = () => {
    setView('lobby');
  };

  const handleOpenReview = (session: SessionRecord) => {
    setReviewSession(session);
    setView('review');
  };

  const handleBackFromReview = () => {
    setReviewSession(null);
    setView('lobby');
  };

  if (view === 'review' && reviewSession) {
    return <SessionReview session={reviewSession} onBack={handleBackFromReview} />;
  }

  if (view === 'quiz') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="inline-flex rounded-md border bg-muted/40 p-1 text-sm">
            <button
              type="button"
              onClick={() => setSelectedSubject('math')}
              className={`rounded px-3 py-1.5 ${
                selectedSubject === 'math' ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Math Quiz
            </button>
            <button
              type="button"
              onClick={() => setSelectedSubject('ai')}
              className={`rounded px-3 py-1.5 ${
                selectedSubject === 'ai' ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground'
              }`}
            >
              AI / ML Quiz
            </button>
          </div>
          <Button variant="outline" onClick={handleQuizComplete}>
            Exit Quiz
          </Button>
        </div>

        <AdaptiveQuiz subject={selectedSubject} onComplete={handleQuizComplete} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Start New Quiz</CardTitle>
          <CardDescription>
            Choose a subject and begin a 5-round adaptive session. Each round has 5 AI-generated
            questions and difficulty adjusts based on your performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <p className="text-sm font-medium">Subject</p>
              <div className="inline-flex rounded-md border bg-muted/40 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setSelectedSubject('math')}
                  className={`rounded px-4 py-1.5 ${
                    selectedSubject === 'math'
                      ? 'bg-background font-semibold shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                >
                  Math
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubject('ai')}
                  className={`rounded px-4 py-1.5 ${
                    selectedSubject === 'ai'
                      ? 'bg-background font-semibold shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                >
                  AI / ML
                </button>
              </div>
            </div>
            <Button onClick={handleStartQuiz} className="sm:ml-4">
              Start New Quiz
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Past Quizzes</h2>
        {sessionHistory.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No quizzes completed yet. Start your first quiz above!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {sessionHistory.map((session) => (
              <Card
                key={session.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => handleOpenReview(session)}
              >
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {session.subject === 'math' ? 'Math' : 'AI / ML'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          MASTERY_COLORS[session.finalMastery] ?? ''
                        }`}
                      >
                        {session.finalMastery}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(session.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-lg font-bold">
                        {session.totalScore}/{session.totalQuestions}
                      </p>
                      <p className="text-xs text-muted-foreground">Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{session.accuracy.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{session.rounds}</p>
                      <p className="text-xs text-muted-foreground">Rounds</p>
                    </div>
                    <div className="hidden sm:block">
                      <div className="flex gap-1">
                        {session.roundBreakdown.map((rb) => (
                          <div
                            key={rb.round}
                            title={`Round ${rb.round}: ${rb.score}/${QUESTIONS_PER_ROUND} (${rb.difficulty})`}
                            className="flex h-7 w-7 items-center justify-center rounded text-xs font-medium"
                            style={{
                              backgroundColor:
                                rb.score >= 4
                                  ? '#dcfce7'
                                  : rb.score >= 2
                                    ? '#fef9c3'
                                    : '#fee2e2',
                              color:
                                rb.score >= 4
                                  ? '#166534'
                                  : rb.score >= 2
                                    ? '#854d0e'
                                    : '#991b1b',
                            }}
                          >
                            {rb.score}
                          </div>
                        ))}
                      </div>
                      <p className="mt-1 text-center text-[10px] text-muted-foreground">
                        Per round
                      </p>
                    </div>
                    <span className="text-muted-foreground text-xs hidden sm:inline">
                      Click to review
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}