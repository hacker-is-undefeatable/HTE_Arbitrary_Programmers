'use client';

import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function LearningPage() {
  return (
    <AppShell title="Learning" subtitle="Continue your study path">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Math Learning</CardTitle>
            <CardDescription>Algebra, geometry, trigonometry and problem solving</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/learn/math">
              <Button className="w-full">Open Math</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Python Learning</CardTitle>
            <CardDescription>Hands-on coding tasks and guided debugging practice</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/learn/python">
              <Button className="w-full">Open Python</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
