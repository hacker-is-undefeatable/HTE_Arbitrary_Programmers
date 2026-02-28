'use client';

import { AppShell } from '@/components/layout/app-shell';
import AdaptiveQuizEngine from '@/components/adaptive-quiz-engine';

export default function AdaptiveQuizzesPage() {
  return (
    <AppShell
      title="Adaptive Quiz Engine"
      subtitle="5-round, Bloom-aligned adaptive sessions for Math and AI"
    >
      <AdaptiveQuizEngine />
    </AppShell>
  );
}
