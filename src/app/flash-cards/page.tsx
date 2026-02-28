'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const FLASH_CARDS = [
  { front: 'What is a variable?', back: 'A named storage location for a value in code or algebra.' },
  { front: 'Quadratic formula?', back: 'x = (-b ± √(b² - 4ac)) / 2a' },
  { front: 'Python list comprehension?', back: 'A compact way to create lists: [expr for item in items if cond].' },
  { front: 'What is debugging?', back: 'The process of finding and fixing errors in logic or syntax.' },
];

export default function FlashCardsPage() {
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  const card = FLASH_CARDS[index];

  return (
    <AppShell title="Flash cards" subtitle="Quick memory recall practice">
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Card {index + 1} of {FLASH_CARDS.length}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-8 text-center">
              <p className="text-lg font-medium">{showBack ? card.back : card.front}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setShowBack((prev) => !prev)}>
              {showBack ? 'Show Front' : 'Show Back'}
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={index === 0}
            onClick={() => {
              setIndex((prev) => prev - 1);
              setShowBack(false);
            }}
          >
            Previous
          </Button>
          <Button
            className="flex-1"
            disabled={index === FLASH_CARDS.length - 1}
            onClick={() => {
              setIndex((prev) => prev + 1);
              setShowBack(false);
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
