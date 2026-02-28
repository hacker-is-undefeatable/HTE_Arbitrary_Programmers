'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { QuizPartyModal } from '@/app/lecture-notes/[sessionId]/page';
import { PublicShell } from '@/components/layout/public-shell';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function JoinQuizPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <PublicShell
      title="Join Quiz Party"
      subtitle="Enter the invite code to join a live quiz. No account needed."
      rightSlot={
        <Link href="/">
          <Button variant="ghost" size="sm">Back to home</Button>
        </Link>
      }
    >
      <div className="max-w-lg mx-auto py-6">
        <QuizPartyModal
          open={true}
          onClose={() => router.push('/')}
          sessionId=""
          sessionTitle="Quiz Party"
          userId={user?.id ?? null}
          joinOnly={true}
        />
      </div>
    </PublicShell>
  );
}
