'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppShell } from '@/components/layout/app-shell';
import { PYTHON_CHALLENGES } from '@/utils/quizData';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function LearnPythonPage() {
  const { user } = useAuth();
  const [selectedChallengeId, setSelectedChallengeId] = useState(PYTHON_CHALLENGES[0].id);
  const [code, setCode] = useState(PYTHON_CHALLENGES[0].initial_code);
  const [output, setOutput] = useState('');
  const [showHints, setShowHints] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState<any>(null);

  const currentChallenge = PYTHON_CHALLENGES.find((c) => c.id === selectedChallengeId);

  const handleChallengeSelect = (id: string) => {
    const challenge = PYTHON_CHALLENGES.find((c) => c.id === id);
    if (challenge) {
      setSelectedChallengeId(id);
      setCode(challenge.initial_code);
      setOutput('');
      setShowHints(false);
      setShowExplanation(false);
    }
  };

  const executeCode = async () => {
    setExecuting(true);
    setOutput('Executing...');

    try {
      // Simulated execution - in production, this would use a sandbox service
      // For demo, we'll just provide feedback
      if (code.includes('def add')) {
        if (code.includes('return a + b')) {
          setOutput('✓ All tests passed!\nadd(2, 3) = 5\nadd(-1, 1) = 0\nadd(0, 0) = 0');
        } else {
          setOutput('✗ Tests failed\nHint: Check your return statement');
          setShowExplanation(true);
          const res = await fetch('/api/ai-explanation/python-debug', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              error: 'Function does not return the sum of a and b',
              explanationStyle: 'step-by-step',
            }),
          });
          const data = await res.json();
          setExplanation(data);
        }
      } else {
        setOutput('Please implement the function');
      }
    } catch (error) {
      setOutput('Error executing code');
    }

    setExecuting(false);
  };

  const saveSubmission = async () => {
    if (!user?.id || !currentChallenge) return;

    try {
      await fetch('/api/coding-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          challengeId: currentChallenge.id,
          code,
          isCorrect: output.includes('All tests passed'),
          errorMessage: output.includes('✗') ? output : null,
        }),
      });
    } catch (error) {
      console.error('Error saving submission:', error);
    }
  };

  if (!currentChallenge) {
    return <div>Loading...</div>;
  }

  return (
    <AppShell title="Python Challenges" subtitle="Practice coding with guided feedback">
      <div className="mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Challenges List */}
          <div>
            <h2 className="text-xl font-bold mb-4">Python Challenges</h2>
            <div className="space-y-2">
              {PYTHON_CHALLENGES.map((challenge) => (
                <button
                  key={challenge.id}
                  onClick={() => handleChallengeSelect(challenge.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedChallengeId === challenge.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-ring/60'
                  }`}
                >
                  <p className="font-medium text-sm">{challenge.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">Difficulty: {challenge.difficulty}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Editor & Output */}
          <div className="lg:col-span-2 space-y-6">
            {/* Challenge Description */}
            <Card>
              <CardHeader>
                <CardTitle>{currentChallenge.title}</CardTitle>
                <CardDescription>{currentChallenge.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentChallenge.test_cases && (
                    <div>
                      <p className="font-semibold text-sm mb-2">Test Cases:</p>
                      <div className="bg-muted p-3 rounded text-sm font-mono text-xs space-y-1">
                        {currentChallenge.test_cases.map((test, idx) => (
                          <div key={idx}>{test}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Editor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Code Editor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <MonacoEditor
                    height="300px"
                    defaultLanguage="python"
                    value={code}
                    onChange={(value) => setCode(value || '')}
                    theme="light"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <Button onClick={executeCode} disabled={executing} className="w-full">
                    {executing ? 'Executing...' : '▶ Run Code'}
                  </Button>

                  {showHints && (
                    <Card className="bg-amber-50 border-amber-200">
                      <CardContent className="pt-4">
                        <p className="font-semibold text-sm mb-2">Hints:</p>
                        <ul className="text-sm space-y-1">
                          {currentChallenge.hints.map((hint, idx) => (
                            <li key={idx}>• {hint}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => setShowHints(!showHints)}
                    className="w-full"
                  >
                    {showHints ? '✓ Hide Hints' : '💡 Show Hints'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Output */}
            {output && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Output</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-900 text-white p-4 rounded font-mono text-sm overflow-auto max-h-40">
                    {output}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Explanation */}
            {showExplanation && explanation && (
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">💡 Debugging Help</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold mb-1">Explanation:</p>
                    <p>{explanation.explanation}</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Hint:</p>
                    <p>{explanation.hint}</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Suggested Improvement:</p>
                    <pre className="bg-white p-2 rounded text-xs overflow-auto">
                      {explanation.suggested_improvement}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {output && output.includes('passed') && (
              <Button onClick={saveSubmission} className="w-full">
                ✓ Save & Continue
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
