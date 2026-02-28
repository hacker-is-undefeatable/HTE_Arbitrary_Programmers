'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicShell } from '@/components/layout/public-shell';

export default function Home() {
  return (
    <PublicShell
      title="Learn Smarter with AI"
      subtitle="Personalized learning paths adapted to your level"
      rightSlot={
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/join-quiz">
            <Button variant="ghost" size="sm" className="text-white">Join Quiz Party</Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        <div className="rounded-xl border bg-muted/20 p-6 sm:p-8">
          <h2 className="text-3xl font-bold mb-3">Master any subject with AI-powered guidance</h2>
          <p className="text-muted-foreground mb-6">
            Personalized explanations, adaptive questions, and smart revision plans in one dashboard-like workspace.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup">
              <Button>Start Learning Free</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">I already have an account</Button>
            </Link>
            <Link href="/join-quiz">
              <Button variant="secondary" className="text-white">Join Quiz Party</Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Have an invite code? Join a live quiz with no account needed — just enter the code and your name.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {features.map((feature) => (
            <Card key={feature.id} className="shadow-none">
              <CardHeader>
                <div className="text-3xl mb-1">{feature.icon}</div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-3">
          {steps.map((step, i) => (
            <div key={i} className="rounded-lg border bg-background p-4 flex gap-3">
              <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </div>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}

const features = [
  {
    id: 1,
    icon: 'AL',
    title: 'Adaptive Learning',
    description: 'Questions adjust to your level automatically. Easy for beginners, challenging for experts.',
  },
  {
    id: 2,
    icon: 'AI',
    title: 'AI Explanations',
    description: 'Get instant explanations for mistakes with personalized feedback based on your style.',
  },
  {
    id: 3,
    icon: 'TP',
    title: 'Track Progress',
    description: 'Monitor your mastery across topics with beautiful dashboards and revision schedules.',
  },
  {
    id: 4,
    icon: 'SH',
    title: 'Smart Hints',
    description: 'Get hints when stuck without spoiling the answer. Learn by deduction.',
  },
  {
    id: 5,
    icon: 'PT',
    title: 'Python Tutor',
    description: 'Interactive coding challenges with AI-powered debugging assistance.',
  },
  {
    id: 6,
    icon: 'GF',
    title: 'Goal-Focused',
    description: 'Personalized roadmaps based on your learning goals and role.',
  },
];

const steps = [
  {
    title: 'Set Up Your Profile',
    description: 'Choose your role and learning style so we can personalize your experience.',
  },
  {
    title: 'Get Personalized Path',
    description: 'AI builds a custom learning journey based on your mastery level.',
  },
  {
    title: 'Practice & Learn',
    description: 'Answer questions that adapt to your level. Get AI explanations for mistakes.',
  },
  {
    title: 'Track & Improve',
    description: 'Monitor progress and follow smart revision schedules to cement learning.',
  },
];
