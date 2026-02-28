'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppShell } from '@/components/layout/app-shell';
import { getDiagnosticQuestions } from '@/utils/quizData';
import { calculateMasteryScore } from '@/utils/masteryEngine';
import { QuizQuestion } from '@/types';

export default function DiagnosticPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id || null);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile && !profileLoading) {
      const subject = profile.role === 'high_school' ? 'math' : 'python';
      const qs = getDiagnosticQuestions(subject, profile.role);
      setQuestions(qs);
    }
  }, [profile, profileLoading]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!authLoading && !profileLoading && user && !profile) {
      router.push('/diagnostic-setup');
    }
  }, [authLoading, profileLoading, user, profile, router]);

  if (authLoading || profileLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const handleAnswerSelect = (answer: string) => {
    setAnswers({ ...answers, [currentQIndex]: answer });
  };

  const handleNext = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(currentQIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    setSaving(true);
    setError('');

    const subject = profile.role === 'high_school' ? 'math' : 'python';

    // Calculate scores
    const topicScores: { [key: string]: { correct: number; total: number } } = {};

    questions.forEach((q, idx) => {
      const isCorrect = answers[idx] === q.correct_answer;
      if (!topicScores[q.topic]) {
        topicScores[q.topic] = { correct: 0, total: 0 };
      }
      topicScores[q.topic].total++;
      if (isCorrect) topicScores[q.topic].correct++;
    });

    // Save attempts and mastery scores
    try {
      // Save all quiz attempts
      const attemptPromises = Object.entries(answers).map(([idx, answer]) => {
        const q = questions[parseInt(idx)];
        const isCorrect = answer === q.correct_answer;

        return fetch('/api/quiz-attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            subject,
            topic: q.topic,
            question: q.question,
            userAnswer: answer,
            correctAnswer: q.correct_answer,
            isCorrect,
          }),
        }).then(async res => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('Quiz attempt API response:', { status: res.status, statusText: res.statusText, error: errorData });
            throw new Error(`Failed to save quiz attempt: ${errorData.error || res.statusText}`);
          }
          return res.json();
        });
      });

      const attemptResults = await Promise.all(attemptPromises);
      console.log('Quiz attempts saved:', attemptResults.length);

      // Save mastery scores per topic
      const scorePromises = Object.entries(topicScores).map(([topic, score]) => {
        const topicScore = (score as any).correct / (score as any).total;
        const masteryScore = calculateMasteryScore(50, topicScore > 0.6); // If > 60%, get +10

        return fetch('/api/mastery-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            subject,
            topic,
            masteryScore: Math.round(masteryScore),
          }),
        }).then(async res => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('Mastery scores API response:', { status: res.status, statusText: res.statusText, topic, error: errorData });
            throw new Error(`Failed to save mastery score for ${topic}: ${errorData.error || res.statusText}`);
          }
          return res.json();
        });
      });

      const scoreResults = await Promise.all(scorePromises);
      console.log('Mastery scores saved:', scoreResults.length);

      setSaving(false);
      // Wait 2 seconds to ensure database is fully updated before redirecting
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error saving results:', err);
      setError(err instanceof Error ? err.message : 'Failed to save assessment results. Please try again.');
      setSaving(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading questions...</div>
      </div>
    );
  }

  const currentQuestion = questions[currentQIndex];
  const subject = profile.role === 'high_school' ? 'Math' : 'Python';
  const progressPercent = ((currentQIndex + 1) / questions.length) * 100;

  return (
    <AppShell title="Diagnostic Assessment" subtitle={`${subject} • Question ${currentQIndex + 1} of ${questions.length}`}>
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Diagnostic Assessment</h1>
          <p className="text-muted-foreground">{subject} • Question {currentQIndex + 1} of {questions.length}</p>
          <div className="w-full bg-muted rounded-full h-2 mt-4">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {!submitted ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{currentQuestion.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswerSelect(option)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      answers[currentQIndex] === option
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-ring/60'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-4 pt-6">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQIndex === 0}
                >
                  Previous
                </Button>
                {currentQIndex === questions.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={saving || Object.keys(answers).length !== questions.length}
                    className="flex-1"
                  >
                    {saving ? 'Submitting...' : 'Submit Diagnostic'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={!answers[currentQIndex]}
                    className="flex-1"
                  >
                    Next
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="text-center">
            <CardContent className="pt-12 pb-12">
              {error ? (
                <>
                  <div className="text-5xl mb-4">❌</div>
                  <h2 className="text-2xl font-bold mb-2 text-red-600">Error Saving Results</h2>
                  <p className="text-muted-foreground mb-8">{error}</p>
                  <Button 
                    onClick={() => {
                      setSubmitted(false);
                      setError('');
                      setSaving(false);
                    }}
                  >
                    Try Again
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold mb-2">Assessment Complete!</h2>
                  <p className="text-muted-foreground mb-8">
                    Analyzing your results and setting up your personalized learning path...
                  </p>
                  <div className="inline-block">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
