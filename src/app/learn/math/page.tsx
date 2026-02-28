'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useMasteryScores } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppShell } from '@/components/layout/app-shell';
import { getDifficultyLevel, calculateMasteryScore } from '@/utils/masteryEngine';
import { QuizQuestion } from '@/types';
import Link from 'next/link';

export default function LearnMathPage() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id || null);
  const { scores, loading: scoresLoading, updateMasteryScore } = useMasteryScores(user?.id || null);

  const [selectedTopic, setSelectedTopic] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<any>(null);
  const [mode] = useState<'study' | 'exam'>('study');
  const [wrongCount, setWrongCount] = useState(0);

  const topics = ['algebra', 'quadratic-equations', 'geometry', 'trigonometry', 'word-problems'];

  const loadQuestions = async (topic: string) => {
    // For demo, use sample questions from quiz bank
    const { MATH_QUIZ_BANK } = await import('@/utils/quizData');

    const masteryScore =
      scores.find((s) => s.subject === 'math' && s.topic === topic)?.mastery_score || 50;
    const difficulty = getDifficultyLevel(masteryScore);

    const bankQuestions = MATH_QUIZ_BANK[difficulty] || [];
    setQuestions(bankQuestions.slice(0, 3));
    setCurrentQIndex(0);
    setAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
    setWrongCount(0);
  };

  const handleAnswerSelect = (answer: string) => {
    if (!submitted) {
      setAnswers({ ...answers, [currentQIndex]: answer });
    }
  };

  const handleSubmit = async () => {
    const currentQuestion = questions[currentQIndex];
    const userAnswer = answers[currentQIndex];
    const isCorrect = userAnswer === currentQuestion.correct_answer;

    setSubmitted(true);

    if (!isCorrect) {
      setWrongCount(wrongCount + 1);

      // Get AI explanation after 2 wrong answers
      if (wrongCount + 1 >= 2 && mode === 'study') {
        try {
          const res = await fetch('/api/ai-explanation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: currentQuestion.question,
              userAnswer,
              correctAnswer: currentQuestion.correct_answer,
              topic: selectedTopic,
              explanationStyle: profile?.preferred_explanation_style || 'step-by-step',
              masteryLevel: scores.find((s) => s.subject === 'math' && s.topic === selectedTopic)
                ?.mastery_score || 50,
            }),
          });
          const data = await res.json();
          setAiExplanation(data);
          setShowExplanation(true);
        } catch (error) {
          console.error('Error getting explanation:', error);
        }
      }
    }

    // Save attempt
    if (user?.id) {
      await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          subject: 'math',
          topic: selectedTopic,
          question: currentQuestion.question,
          userAnswer,
          correctAnswer: currentQuestion.correct_answer,
          isCorrect,
        }),
      });

      // Update mastery score
      const currentMastery =
        scores.find((s) => s.subject === 'math' && s.topic === selectedTopic)?.mastery_score || 50;
      const newMastery = calculateMasteryScore(currentMastery, isCorrect);
      await updateMasteryScore('math', selectedTopic, newMastery);
    }
  };

  const handleNext = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
      setSubmitted(false);
      setShowExplanation(false);
      setAiExplanation(null);
    }
  };

  if (profileLoading || scoresLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!selectedTopic) {
    return (
      <AppShell title="Math Practice" subtitle="Choose a topic to begin adaptive practice">
        <div className="mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-4">
            {topics.map((topic) => {
              const score = scores.find((s) => s.subject === 'math' && s.topic === topic);
              const masteryScore = score?.mastery_score || 50;
              const difficulty = getDifficultyLevel(masteryScore);

              return (
                <Card
                  key={topic}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setSelectedTopic(topic);
                    loadQuestions(topic);
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg capitalize">{topic.replace('-', ' ')}</h3>
                        <p className="text-sm text-muted-foreground">Difficulty: {difficulty}</p>
                      </div>
                      <div className="text-3xl font-bold text-primary">{masteryScore}%</div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${masteryScore}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </AppShell>
    );
  }

  if (questions.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">Loading questions...</div>;
  }

  const currentQuestion = questions[currentQIndex];
  const userAnswer = answers[currentQIndex];
  const isCorrect = userAnswer === currentQuestion.correct_answer;

  return (
    <AppShell title="Math Practice" subtitle={selectedTopic.replace('-', ' ')}>
      <div className="mx-auto max-w-2xl">
        <div className="flex justify-between items-center mb-8">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedTopic('');
              setQuestions([]);
            }}
          >
            ← Back to Topics
          </Button>
          <div className="text-right">
            <p className="font-semibold">
              Question {currentQIndex + 1} of {questions.length}
            </p>
            <p className="text-sm text-muted-foreground">{selectedTopic}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{currentQuestion.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={submitted}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    userAnswer === option
                      ? submitted
                        ? isCorrect
                          ? 'border-green-500 bg-green-50'
                          : 'border-red-500 bg-red-50'
                        : 'border-primary bg-primary/5'
                      : submitted && option === currentQuestion.correct_answer
                      ? 'border-green-500 bg-green-50'
                      : 'border-border'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {/* Feedback */}
            {submitted && (
              <div
                className={`p-4 rounded-lg ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
              >
                <p className="font-semibold">{isCorrect ? '✓ Correct!' : '✗ Incorrect'}</p>
                {!isCorrect && (
                  <p className="text-sm mt-2">
                    The correct answer is: <strong>{currentQuestion.correct_answer}</strong>
                  </p>
                )}
              </div>
            )}

            {/* AI Explanation */}
            {showExplanation && aiExplanation && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg">💡 AI Explanation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold mb-1">Why it was wrong:</p>
                    <p>{aiExplanation.explanation}</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Misconception:</p>
                    <p>{aiExplanation.misconception}</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Try this:</p>
                    <p>{aiExplanation.follow_up_question}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-6">
              {!submitted ? (
                <Button onClick={handleSubmit} disabled={!userAnswer} className="flex-1">
                  Check Answer
                </Button>
              ) : currentQIndex === questions.length - 1 ? (
                <Link href="/dashboard" className="flex-1">
                  <Button className="w-full">Finish & Review</Button>
                </Link>
              ) : (
                <Button onClick={handleNext} className="flex-1">
                  Next Question
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
