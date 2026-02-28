'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import {
  Circle,
  Settings,
  HelpCircle,
  UserCircle,
  LogOut,
  Plus,
} from 'lucide-react';
import CompanionWidget from '@/app/api/companion/CompanionWidget';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id || null);
  const [lectureSessions, setLectureSessions] = useState<any[]>([]);
  const [revisionTimeLogs, setRevisionTimeLogs] = useState<any[]>([]);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');

  const revisionChart = useMemo(() => {
    const days = 7;
    const buckets: Record<string, number> = {};

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      buckets[key] = 0;
    }

    revisionTimeLogs.forEach((log) => {
      const key = String(log.started_at || '').slice(0, 10);
      if (key in buckets) {
        buckets[key] += Number(log.duration_seconds || 0);
      }
    });

    const labels = Object.keys(buckets).map((key) => {
      const date = new Date(key);
      return `${date.toLocaleString('en-US', { month: 'short' })} ${date.getDate()}`;
    });

    const hours = Object.values(buckets).map((seconds) => Number((seconds / 3600).toFixed(2)));
    const points = hours.map((value) => Math.max(0.05, value));

    const totalHours = Number((revisionTimeLogs.reduce((sum, item) => sum + Number(item.duration_seconds || 0), 0) / 3600).toFixed(2));

    const max = Math.max(...points, 1);
    const desktopPoints = points
      .map((value, index) => {
        const x = (index / (points.length - 1)) * 100;
        const y = 100 - (value / max) * 80;
        return `${x},${y}`;
      })
      .join(' ');

    return {
      labels,
      points,
      totalHours,
      desktopArea: `0,100 ${desktopPoints} 100,100`,
      desktopLine: desktopPoints,
    };
  }, [revisionTimeLogs]);

  const lectureCards = useMemo(() => {
    return lectureSessions.map((session) => ({
      sessionId: session.id,
      label: session.lecture_title || 'Untitled Lecture',
      value: `${(session.generated_quizzes || []).length} quizzes`,
      note: `${(session.generated_flashcards || []).length} flashcards generated`,
      sub: `Created ${new Date(session.created_at).toLocaleDateString()}`,
    }));
  }, [lectureSessions]);

  const allSelected = lectureCards.length > 0 && selectedSessionIds.length === lectureCards.length;

  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId]
    );
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedSessionIds([]);
      return;
    }
    setSelectedSessionIds(lectureCards.map((lecture) => lecture.sessionId));
  };

  const handleToggleBatchDeleteMode = () => {
    if (batchDeleteMode) {
      setBatchDeleteMode(false);
      setSelectedSessionIds([]);
      setShowDeleteWarning(false);
      setActionError('');
      return;
    }
    setBatchDeleteMode(true);
  };

  const fetchSessionData = async () => {
    if (!user?.id) return;

    try {
      const [sessionsRes, revisionTimeRes] = await Promise.all([
        fetch(`/api/quick-create?userId=${user.id}`),
        fetch(`/api/revision-time?userId=${user.id}`),
      ]);

      if (sessionsRes.ok) {
        const sessions = await sessionsRes.json();
        setLectureSessions(Array.isArray(sessions) ? sessions : []);
      }

      if (revisionTimeRes.ok) {
        const revisionLogs = await revisionTimeRes.json();
        setRevisionTimeLogs(Array.isArray(revisionLogs) ? revisionLogs : []);
      }
    } catch (error) {
      console.warn('Failed to fetch dashboard session data:', error);
    }
  };

  const confirmDeleteSelected = async () => {
    if (!user?.id || selectedSessionIds.length === 0) return;

    setDeleting(true);
    setActionError('');

    try {
      const response = await fetch('/api/quick-create', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          sessionIds: selectedSessionIds,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete selected lectures.');
      }

      setSelectedSessionIds([]);
      setShowDeleteWarning(false);
      setBatchDeleteMode(false);
      await fetchSessionData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to delete selected lectures.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchSessionData();
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-700">Loading your dashboard...</div>
          <p className="text-sm text-slate-500 mt-2">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Welcome to your dashboard</CardTitle>
            <CardDescription>
              Complete your profile first to personalize your learning path.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Link href="/settings" className="w-full sm:w-auto">
              <Button className="w-full">Set Up Profile</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="hidden min-h-screen w-[250px] border-r bg-muted/30 p-4 lg:flex lg:flex-col">
          <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium">
            <Circle className="h-4 w-4" />
            <Link href="/dashboard" className="hover:text-primary transition-colors">
              Acme Inc.
            </Link>
          </div>

          <Button asChild className="mt-6 justify-start rounded-lg bg-foreground text-background hover:bg-foreground/90">
            <Link href="/quick-create">
              <Plus className="mr-2 h-4 w-4" />
              Quick Create
            </Link>
          </Button>

          <div className="mt-auto space-y-1">
            <Link href="/profile" className="block">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <UserCircle className="h-4 w-4" />
                <span>Profile</span>
              </button>
            </Link>
            <Link href="/settings" className="block">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
            </Link>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Get Help</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>

            <div className="mt-3 rounded-lg border bg-background p-3">
              <div className="text-sm font-medium">{profile.name}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
        </aside>

        <main className="w-full p-4 lg:p-5">
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-medium sm:text-base">Dashboards</h1>
                <Button variant="outline" size="sm" onClick={handleToggleBatchDeleteMode}>
                  {batchDeleteMode ? 'Cancel Batch Delete' : 'Batch Delete'}
                </Button>
              </div>
              {batchDeleteMode ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">{selectedSessionIds.length} selected</p>
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {allSelected ? 'Unselect All' : 'Select All'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteWarning(true)}
                    disabled={selectedSessionIds.length === 0}
                  >
                    Delete Selected
                  </Button>
                </div>
              ) : (
                <div />
              )}
            </div>

            <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
              {lectureCards.length > 0 ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {lectureCards.map((lecture) => (
                    <Card key={lecture.sessionId} className="relative rounded-xl shadow-none">
                      {batchDeleteMode ? (
                        <label className="absolute right-3 top-3 z-10 inline-flex items-center rounded-md bg-background/80 p-1">
                          <input
                            type="checkbox"
                            checked={selectedSessionIds.includes(lecture.sessionId)}
                            onChange={() => toggleSessionSelection(lecture.sessionId)}
                            className="h-4 w-4 rounded border border-black accent-black"
                          />
                        </label>
                      ) : null}
                      <Link href={`/lecture-notes/${lecture.sessionId}`} className="block rounded-xl transition-colors hover:bg-muted/30">
                        <CardHeader className="space-y-2 p-4">
                          <CardDescription className="text-lg font-semibold text-foreground">{lecture.label}</CardDescription>
                          <CardTitle className="text-base font-medium tracking-normal text-muted-foreground">{lecture.value}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 p-4 pt-0 text-sm">
                          <p className="font-medium">{lecture.note}</p>
                          <p className="text-muted-foreground">{lecture.sub}</p>
                        </CardContent>
                      </Link>
                    </Card>
                  ))}
                </div>
                </>
              ) : (
                <Card className="rounded-xl shadow-none">
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    No lecture yet. Create a lecture using Quick Create.
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-xl shadow-none">
                <CardHeader className="flex flex-row items-start justify-between gap-3 p-4">
                  <div>
                    <CardTitle className="text-xl">Revision Time Spent</CardTitle>
                    <CardDescription>Total revision hours tracked from your revision page sessions</CardDescription>
                  </div>
                  <div className="inline-flex items-center rounded-md border bg-muted/30 px-3 py-1 text-sm font-medium">
                    {revisionChart.totalHours} hours
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                  <div className="h-[270px] w-full rounded-lg border bg-muted/20 p-3">
                    <svg viewBox="0 0 100 100" className="h-full w-full text-muted-foreground" preserveAspectRatio="none">
                      <line x1="0" y1="82" x2="100" y2="82" className="stroke-border" strokeWidth="0.3" />
                      <line x1="0" y1="60" x2="100" y2="60" className="stroke-border" strokeWidth="0.3" />
                      <line x1="0" y1="40" x2="100" y2="40" className="stroke-border" strokeWidth="0.3" />
                      <line x1="0" y1="20" x2="100" y2="20" className="stroke-border" strokeWidth="0.3" />
                      <polygon points={revisionChart.desktopArea} className="fill-foreground/15" />
                      <polyline points={revisionChart.desktopLine} className="fill-none stroke-foreground/80" strokeWidth="0.5" />
                    </svg>
                  </div>

                  <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
                    {revisionChart.labels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {showDeleteWarning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <Card className="w-full max-w-md border-red-300">
                <CardHeader>
                  <CardTitle className="text-red-700">Warning</CardTitle>
                  <CardDescription className="text-red-700">
                    Deleting selected lectures cannot be reverted.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {actionError ? <p className="text-sm text-red-700">{actionError}</p> : null}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteWarning(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={confirmDeleteSelected}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Confirm Delete'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      <CompanionWidget />
    </div>
  );
}
