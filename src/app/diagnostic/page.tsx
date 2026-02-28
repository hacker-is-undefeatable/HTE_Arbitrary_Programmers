'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  useEffect(() => {
    if (profile && !profileLoading) {
      const subject = profile.role === 'high_school' ? 'math' : 'python';
      const qs = getDiagnosticQuestions(subject, profile.role);
      setQuestions(qs);
    }
  }, [profile, profileLoading]);

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
      for (const [idx, answer] of Object.entries(answers)) {
        const q = questions[parseInt(idx)];
        const isCorrect = answer === q.correct_answer;

        // Save attempt
        await fetch('/api/quiz-attempts', {
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
        });
      }

      // Save mastery scores per topic
      for (const [topic, score] of Object.entries(topicScores)) {
        const topicScore = (score as any).correct / (score as any).total;
        const masteryScore = calculateMasteryScore(50, topicScore > 0.6); // If > 60%, get +10

        await fetch('/api/mastery-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            subject,
            topic,
            masteryScore: Math.round(masteryScore),
          }),
        });
      }
    } catch (error) {
      console.error('Error saving results:', error);
    }

    setSaving(false);
    setTimeout(() => {
      router.push('/dashboard');
    }, 1000);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Diagnostic Assessment</h1>
          <p className="text-slate-600">{subject} • Question {currentQIndex + 1} of {questions.length}</p>
          <div className="w-full bg-slate-200 rounded-full h-2 mt-4">
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
                        ? 'border-primary bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
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
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2">Assessment Complete!</h2>
              <p className="text-slate-600 mb-8">
                Analyzing your results and setting up your personalized learning path...
              </p>
              <div className="inline-block">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
