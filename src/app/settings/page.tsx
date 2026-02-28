'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppShell } from '@/components/layout/app-shell';

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { profile, updateProfile, loading: profileLoading } = useProfile(user?.id || null);

  const [name, setName] = useState(profile?.name || '');
  const [role, setRole] = useState(profile?.role || 'high_school');
  const [learningGoal, setLearningGoal] = useState(profile?.learning_goal || '');
  const [explanationStyle, setExplanationStyle] = useState(
    profile?.preferred_explanation_style || 'step-by-step'
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    const result = await updateProfile({
      id: profile?.id || '',
      name,
      role: role as 'high_school' | 'college',
      learning_goal: learningGoal,
      preferred_explanation_style: explanationStyle as 'step-by-step' | 'conceptual' | 'visual',
      created_at: profile?.created_at || '',
      updated_at: new Date().toISOString(),
    });

    if (result) {
      setMessage('Settings saved successfully!');
    } else {
      setMessage('Failed to save settings');
    }

    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (profileLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <AppShell title="Settings" subtitle="Manage your profile and account">
      <div className="mx-auto max-w-2xl space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {message && (
                <div
                  className={`p-3 rounded-lg ${
                    message.includes('success')
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {message}
                </div>
              )}

              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">Contact support to change email</p>
              </div>

              {/* Role */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Education Level</label>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    { value: 'high_school', label: 'High School' },
                    { value: 'college', label: 'College' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setRole(option.value as 'high_school' | 'college')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        role === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-ring/60'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Learning Goal */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Learning Goal</label>
                <Input
                  value={learningGoal}
                  onChange={(e) => setLearningGoal(e.target.value)}
                  placeholder="e.g., Master Python for interviews"
                />
              </div>

              {/* Explanation Style */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Preferred Explanation Style</label>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    { value: 'step-by-step', label: 'Step-by-Step' },
                    { value: 'conceptual', label: 'Conceptual' },
                    { value: 'visual', label: 'Visual' },
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
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Manage your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleSignOut} variant="destructive" className="w-full">
                Sign Out
              </Button>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>About DualPath AI</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>DualPath AI v0.1.0 - Hackathon Edition</p>
              <p className="mt-2">
                An AI-powered personalized learning platform designed to help students master any subject through adaptive learning, intelligent feedback, and spaced repetition.
              </p>
            </CardContent>
          </Card>
      </div>
    </AppShell>
  );
}
