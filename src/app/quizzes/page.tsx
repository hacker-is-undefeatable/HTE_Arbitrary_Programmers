'use client';

import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function QuizzesPage() {
  return (
    <AppShell title="Quizzes" subtitle="Take assessments and topic quizzes">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Learning Quizzes</CardTitle>
            <CardDescription>Start quiz sessions from your learning modules.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/learning">
              <Button className="w-full">Open Learning Modules</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Practice Quizzes</CardTitle>
            <CardDescription>Answer adaptive questions by subject and topic.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/learn/math" className="block">
              <Button variant="outline" className="w-full">Math Quiz Practice</Button>
            </Link>
            <Link href="/learn/python" className="block">
              <Button variant="outline" className="w-full">Python Quiz Practice</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adaptive Quiz Engine</CardTitle>
            <CardDescription>
              5-round, AI-style adaptive sessions for Math and AI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/quizzes/adaptive">
              <Button className="w-full">Open Adaptive Quiz</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
