'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary">
            ✨ DualPath AI
          </div>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
            Learn Smarter with AI
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Personalized learning paths adapted to your level. Master any subject with AI-powered explanations and intelligent practice.
          </p>
          <div className="space-x-4">
            <Link href="/signup">
              <Button size="lg" className="rounded-full">
                Start Learning Free
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="rounded-full">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 px-4 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Powerful Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="text-4xl mb-2">{feature.icon}</div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
          <div className="space-y-6">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-6">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-slate-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Learning?</h2>
          <p className="text-xl mb-8">Join students who are mastering their subjects with AI-powered learning.</p>
          <Link href="/signup">
            <Button size="lg" variant="outline" className="rounded-full">
              Start Free Today
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="mb-2">🚀 DualPath AI - Hackathon Edition</p>
          <p className="text-slate-400">Building the future of personalized education</p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    id: 1,
    icon: '📊',
    title: 'Adaptive Learning',
    description: 'Questions adjust to your level automatically. Easy for beginners, challenging for experts.',
  },
  {
    id: 2,
    icon: '🤖',
    title: 'AI Explanations',
    description: 'Get instant explanations for mistakes with personalized feedback based on your style.',
  },
  {
    id: 3,
    icon: '📈',
    title: 'Track Progress',
    description: 'Monitor your mastery across topics with beautiful dashboards and revision schedules.',
  },
  {
    id: 4,
    icon: '💡',
    title: 'Smart Hints',
    description: 'Get hints when stuck without spoiling the answer. Learn by deduction.',
  },
  {
    id: 5,
    icon: '🐍',
    title: 'Python Tutor',
    description: 'Interactive coding challenges with AI-powered debugging assistance.',
  },
  {
    id: 6,
    icon: '🎯',
    title: 'Goal-Focused',
    description: 'Personalized roadmaps based on your learning goals and role.',
  },
];

const steps = [
  {
    title: 'Take Diagnostic Quiz',
    description: 'Answer 5 questions to establish your baseline knowledge for each subject.',
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
