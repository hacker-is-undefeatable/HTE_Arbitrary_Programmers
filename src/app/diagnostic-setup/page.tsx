'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppShell } from '@/components/layout/app-shell';

export default function DiagnosticSetupPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { createProfile } = useProfile(user?.id || null);

  const [role, setRole] = useState<'high_school' | 'college'>('high_school');
  const [name, setName] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [explanationStyle, setExplanationStyle] = useState<'step-by-step' | 'conceptual' | 'visual'>('step-by-step');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const profile = await createProfile({
        id: user?.id || '',
        name,
        role,
        learning_goal: learningGoal,
        preferred_explanation_style: explanationStyle,
      });

      if (profile) {
        router.push('/diagnostic');
      } else {
        setError('Failed to create profile');
      }
    } catch (err) {
      setError('An error occurred');
    }

    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">✨</div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <AppShell title="Let's Get Started" subtitle="Tell us about yourself">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Help us personalize your learning experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">First Name</label>
              <Input
                placeholder="Alex"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">What's your education level?</label>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    value: 'high_school',
                    label: 'High School Student',
                    description: 'Focus on Algebra, Geometry, Trigonometry',
                  },
                  {
                    value: 'college',
                    label: 'College Student',
                    description: 'Advanced Math, CS, Python, ML fundamentals',
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setRole(option.value as 'high_school' | 'college')}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      role === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-ring/60'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Learning Goal */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Learning Goal (Optional)</label>
              <Input
                placeholder="e.g., Master Python for interviews"
                value={learningGoal}
                onChange={(e) => setLearningGoal(e.target.value)}
              />
            </div>

            {/* Explanation Style */}
            <div className="space-y-3">
              <label className="text-sm font-medium">How do you prefer to learn?</label>
              <div className="grid md:grid-cols-3 gap-3">
                {[
                  {
                    value: 'step-by-step',
                    label: 'Step-by-Step',
                    description: 'Detailed instructions',
                  },
                  {
                    value: 'conceptual',
                    label: 'Conceptual',
                    description: 'Understand principles',
                  },
                  {
                    value: 'visual',
                    label: 'Visual',
                    description: 'Diagrams and visuals',
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      setExplanationStyle(option.value as 'step-by-step' | 'conceptual' | 'visual')
                    }
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      explanationStyle === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-ring/60'
                    }`}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              disabled={loading || !name.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? 'Setting up...' : 'Continue to Diagnostic'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
