'use client';

import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { profile, loading } = useProfile(user?.id || null);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <AppShell title="Profile" subtitle="Your account profile and preferences">
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{loading ? 'Loading...' : (profile?.name || 'Not set')}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email || 'Not available'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium">{profile?.role || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Learning Goal</span>
              <span className="font-medium">{profile?.learning_goal || 'Not set'}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Link href="/settings" className="flex-1">
            <Button variant="outline" className="w-full">Settings</Button>
          </Link>
          <Button variant="destructive" className="flex-1" onClick={handleLogout}>Logout</Button>
        </div>
      </div>
    </AppShell>
  );
}
