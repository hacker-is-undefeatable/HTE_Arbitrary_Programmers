'use client';

import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const NOTES = [
  { title: 'Algebra Basics', summary: 'Linear equations, variables, and balancing expressions.' },
  { title: 'Quadratic Patterns', summary: 'Factoring, graph shapes, and solving by roots.' },
  { title: 'Python Functions', summary: 'Function syntax, parameters, return values, and examples.' },
  { title: 'Debugging Checklist', summary: 'Read errors, isolate issues, test with small inputs.' },
];

export default function LectureNotesPage() {
  return (
    <AppShell title="Lecture Notes" subtitle="Review key concepts quickly">
      <div className="grid gap-4 md:grid-cols-2">
        {NOTES.map((note) => (
          <Card key={note.title}>
            <CardHeader>
              <CardTitle className="text-xl">{note.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{note.summary}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
