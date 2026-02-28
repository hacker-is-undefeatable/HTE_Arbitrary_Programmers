'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicShell } from '@/components/layout/public-shell';
import {
  BookOpenCheck,
  Bot,
  Brain,
  Clock3,
  Compass,
  Plane,
  Sparkles,
} from 'lucide-react';

export default function Home() {
  return (
    <PublicShell
      title="Learn Smarter with ScholarFly"
      subtitle="Personalized learning paths, adaptive quizzes, and focused revision in one workspace"
      rightSlot={
        <div className="space-x-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-10">
        <section className="relative overflow-hidden rounded-xl border bg-muted/20 p-6 sm:p-8">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/10" />
          <div className="absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-primary/5" />

          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered personalized learning
            </div>

            <h2 className="mb-3 text-3xl font-bold leading-tight sm:text-4xl">
              Turn every lecture into clear learning flights
            </h2>
            <p className="mb-6 max-w-2xl text-muted-foreground">
              Upload materials, get concise summaries, generate quizzes and flashcards, then follow a smart revision
              route tailored to your pace.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/signup">
                <Button>Board your Flight</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline">I already have an account</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="shadow-none">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.id} className="shadow-none">
              <CardHeader>
                <div className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </section>

        <section>
          <h3 className="mb-3 text-lg font-semibold">How it works</h3>
          <div className="grid gap-3">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3 rounded-lg border bg-background p-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}

const highlights = [
  {
    title: 'Lecture to Notes',
    description: 'Auto summary in minutes',
    icon: BookOpenCheck,
  },
  {
    title: 'Adaptive Quizzes',
    description: 'Difficulty that fits your level',
    icon: Brain,
  },
  {
    title: 'Revision Tracking',
    description: 'Visual progress over time',
    icon: Clock3,
  },
];

const features = [
  {
    id: 1,
    icon: Plane,
    title: 'Board your Flight',
    description: 'Upload lecture media or notes to generate transcript, summary, quizzes, and flashcards in one flow.',
  },
  {
    id: 2,
    icon: Compass,
    title: 'Flight Tickets & History',
    description: 'View ticket-style checkpoints and full session history directly from the dashboard and lecture notes.',
  },
  {
    id: 3,
    icon: Brain,
    title: 'Adaptive Quizzes',
    description: 'Take adaptive quizzes, save attempts, and review quiz history with explanations over time.',
  },
  {
    id: 4,
    icon: Clock3,
    title: 'Revision Planner & Analytics',
    description: 'Track revision time and explore smooth progress trends across 7 days, 30 days, or 1 year.',
  },
  {
    id: 5,
    icon: Bot,
    title: 'Live2D AI Companion',
    description: 'Chat with your on-screen study companion about lectures, quizzes, revision plans, and wellbeing.',
  },
  {
    id: 6,
    icon: Sparkles,
    title: 'Personalized Mastery',
    description: 'Use profile-based preferences with mastery and revision engines to tailor your learning path.',
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
