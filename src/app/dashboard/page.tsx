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
  Plane,
  Award,
} from 'lucide-react';

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
  const [revisionRange, setRevisionRange] = useState<'7d' | '30d' | '1y'>('7d');
  const [walletAddress, setWalletAddress] = useState('');
  const [sftBalance, setSftBalance] = useState<string | null>(null);
  const [loadingSftBalance, setLoadingSftBalance] = useState(false);
  const [sftError, setSftError] = useState('');

  const revisionChart = useMemo(() => {
    const days = revisionRange === '30d' ? 30 : revisionRange === '1y' ? 365 : 7;
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

    const totalHours = Number(
      (Object.values(buckets).reduce((sum, seconds) => sum + Number(seconds || 0), 0) / 3600).toFixed(2)
    );

    const max = Math.max(...points, 1);
    const chartPoints = points
      .map((value, index) => {
        const x = (index / (points.length - 1)) * 100;
        const y = 100 - (value / max) * 80;
        return { x, y };
      });

    const linePath = chartPoints.reduce((path, point, index, arr) => {
      if (index === 0) {
        return `M ${point.x},${point.y}`;
      }

      const previous = arr[index - 1];
      const controlX = (previous.x + point.x) / 2;

      return `${path} C ${controlX},${previous.y} ${controlX},${point.y} ${point.x},${point.y}`;
    }, '');

    const firstPoint = chartPoints[0];
    const lastPoint = chartPoints[chartPoints.length - 1];
    const areaPath = `${linePath} L ${lastPoint.x},100 L ${firstPoint.x},100 Z`;

    return {
      labels,
      points,
      totalHours,
      desktopAreaPath: areaPath,
      desktopLinePath: linePath,
    };
  }, [revisionTimeLogs, revisionRange]);

  const revisionXAxisLabels = useMemo(() => {
    const sourceLabels = revisionChart.labels;
    const targetCount = 7;

    if (sourceLabels.length <= targetCount) {
      return sourceLabels;
    }

    return Array.from({ length: targetCount }, (_, index) => {
      const sourceIndex = Math.round((index * (sourceLabels.length - 1)) / (targetCount - 1));
      return sourceLabels[sourceIndex];
    });
  }, [revisionChart.labels]);

  const lectureCards = useMemo(() => {
    return [...lectureSessions]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
      .map((session) => {
        const createdAt = new Date(session.created_at);
        const flightTickets = Array.isArray(session.flight_tickets) ? session.flight_tickets : [];
        const isCompleted =
          flightTickets.length > 0 && flightTickets.every((ticket: any) => Boolean(ticket.completed));

        return {
          sessionId: session.id,
          label: session.lecture_title || 'Untitled Lecture',
          value: `${(session.generated_quizzes || []).length} quizzes`,
          note: `${(session.generated_flashcards || []).length} flashcards generated`,
          sub: `Created ${createdAt.toLocaleDateString()}`,
          time: createdAt.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          date: createdAt.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
          }),
          isCompleted,
        };
      });
  }, [lectureSessions]);

  const allSelected = lectureSessions.length > 0 && selectedSessionIds.length === lectureSessions.length;

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
    setSelectedSessionIds(lectureSessions.map((session) => String(session.id)));
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
    if (typeof window === 'undefined') return;
    const storedWallet = localStorage.getItem('scholarfly_wallet_address') || '';
    setWalletAddress(storedWallet);
  }, []);

  useEffect(() => {
    const fetchSftBalance = async () => {
      if (!walletAddress) {
        setSftBalance(null);
        setSftError('');
        return;
      }

      setLoadingSftBalance(true);
      setSftError('');
      try {
        const response = await fetch(
          `/api/token-balance?walletAddress=${encodeURIComponent(walletAddress)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load SFT balance.');
        }

        const balance = Number.parseFloat(String(data?.balanceFormatted || '0'));
        setSftBalance(Number.isFinite(balance) ? balance.toFixed(4) : String(data?.balanceFormatted || '0'));
      } catch (error) {
        setSftBalance(null);
        setSftError(error instanceof Error ? error.message : 'Failed to load SFT balance.');
      } finally {
        setLoadingSftBalance(false);
      }
    };

    fetchSftBalance();
  }, [walletAddress]);

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
              ScholarFly
            </Link>
          </div>

          <Button asChild className="mt-6 justify-start rounded-lg bg-foreground text-background hover:bg-foreground/90">
            <Link href="/quick-create">
              <Plus className="mr-2 h-4 w-4" />
              Board your Flight
            </Link>
          </Button>

          <Link
            href="/badges"
            className="mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Award className="h-4 w-4" />
            <span>Badges</span>
          </Link>

          <div className="mt-3 rounded-lg border bg-background p-3">
            <div className="text-xs text-muted-foreground">SFT Balance</div>
            <div className="mt-1 text-lg font-semibold">
              {loadingSftBalance ? 'Loading...' : sftBalance !== null ? `${sftBalance} SFT` : '0.0000 SFT'}
            </div>
            {walletAddress ? (
              <div className="mt-1 text-[11px] text-muted-foreground">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </div>
            ) : (
              <div className="mt-1 text-[11px] text-muted-foreground">Connect wallet on Badges page</div>
            )}
            {sftError ? <div className="mt-1 text-[11px] text-red-600">{sftError}</div> : null}
          </div>

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
              </div>
              <div />
            </div>

            <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
              {lectureCards.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">Showing latest 3 flights.</p>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {lectureCards.map((lecture) => (
                    <Card key={lecture.sessionId} className="group relative overflow-hidden rounded-xl border-primary/20 bg-muted/20 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                      <Link href={`/lecture-notes/${lecture.sessionId}`} className="block rounded-xl transition-colors duration-200 hover:bg-muted/35">
                        <div className="relative flex items-stretch">
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/35 via-primary/20 to-transparent transition-opacity duration-200 group-hover:opacity-100" />
                          <span className="absolute -left-2 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 rounded-full border bg-card" />
                          <span className="absolute -right-2 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 rounded-full border bg-card" />

                          <div className="min-w-0 flex-1 p-4">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/20 bg-primary/15 text-primary">
                                <Plane className="h-3.5 w-3.5" />
                              </span>
                              <CardDescription className="line-clamp-1 text-lg font-semibold text-foreground">
                                {lecture.label}
                              </CardDescription>
                            </div>
                            <div
                              className={`mt-2 inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${
                                lecture.isCompleted
                                  ? 'border-green-200 bg-green-100 text-green-700'
                                  : 'border-yellow-200 bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {lecture.isCompleted ? 'Completed' : 'In Progress'}
                            </div>
                            <CardTitle className="mt-2 text-base font-medium tracking-normal text-muted-foreground">
                              {lecture.value}
                            </CardTitle>
                            <p className="mt-1 text-sm font-medium">{lecture.note}</p>
                            <p className="text-sm text-muted-foreground">{lecture.sub}</p>
                          </div>

                          <div className="flex w-[92px] shrink-0 flex-col items-center justify-center border-l border-dashed border-primary/20 bg-primary/5 p-3 transition-colors duration-200 group-hover:bg-primary/10">
                            <p className="text-2xl font-semibold leading-none">{lecture.time}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{lecture.date}</p>
                          </div>
                        </div>
                      </Link>
                    </Card>
                  ))}
                </div>
                </>
              ) : (
                <Card className="rounded-xl shadow-none">
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    No lecture yet. Create a lecture using Board your Flight.
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-xl shadow-none">
                <CardHeader className="flex flex-row items-start justify-between gap-3 p-4">
                  <div>
                    <CardTitle className="text-xl">Revision Time Spent</CardTitle>
                    <CardDescription>Total revision hours tracked from your selected period</CardDescription>
                    <div className="mt-3 inline-flex items-center gap-1 rounded-md border bg-muted/30 p-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={revisionRange === '7d' ? 'default' : 'ghost'}
                        onClick={() => setRevisionRange('7d')}
                      >
                        7 days
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={revisionRange === '30d' ? 'default' : 'ghost'}
                        onClick={() => setRevisionRange('30d')}
                      >
                        30 days
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={revisionRange === '1y' ? 'default' : 'ghost'}
                        onClick={() => setRevisionRange('1y')}
                      >
                        1 year
                      </Button>
                    </div>
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
                      <path d={revisionChart.desktopAreaPath} className="fill-foreground/15" />
                      <path d={revisionChart.desktopLinePath} className="fill-none stroke-foreground/80" strokeWidth="0.5" />
                    </svg>
                  </div>

                  <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
                    {revisionXAxisLabels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-none">
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle>Session History</CardTitle>
                      <CardDescription>Previously processed sessions with stored materials</CardDescription>
                    </div>

                    <Button variant="outline" size="sm" onClick={handleToggleBatchDeleteMode}>
                      {batchDeleteMode ? 'Cancel Batch Delete' : 'Batch Delete'}
                    </Button>
                  </div>

                  {batchDeleteMode ? (
                    <div className="flex flex-wrap items-center gap-2">
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
                  ) : null}
                </CardHeader>
                <CardContent>
                  {lectureSessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No saved sessions yet.</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {[...lectureSessions]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((session) => {
                          const createdAt = new Date(session.created_at);
                          const flightTickets = Array.isArray(session.flight_tickets)
                            ? session.flight_tickets
                            : [];
                          const isCompleted =
                            flightTickets.length > 0 &&
                            flightTickets.every((ticket: any) => Boolean(ticket.completed));

                          const ticketCard = (
                            <div className="group relative overflow-hidden rounded-xl border border-primary/20 bg-muted/20 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                              {batchDeleteMode ? (
                                <label className="absolute right-3 top-3 z-10 inline-flex items-center rounded-md bg-background/80 p-1">
                                  <input
                                    type="checkbox"
                                    checked={selectedSessionIds.includes(String(session.id))}
                                    onChange={() => toggleSessionSelection(String(session.id))}
                                    className="h-4 w-4 rounded border border-black accent-black"
                                  />
                                </label>
                              ) : null}
                              <div className="relative flex items-stretch">
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/35 via-primary/20 to-transparent transition-opacity duration-200 group-hover:opacity-100" />
                                <span className="absolute -left-2 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 rounded-full border bg-card" />
                                <span className="absolute -right-2 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 rounded-full border bg-card" />

                                <div className="min-w-0 flex-1 p-4">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/20 bg-primary/15 text-primary">
                                      <Plane className="h-3.5 w-3.5" />
                                    </span>
                                    <p className="line-clamp-1 text-lg font-semibold text-foreground">
                                      {session.lecture_title || 'Untitled Lecture'}
                                    </p>
                                  </div>
                                  <div
                                    className={`mt-2 inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${
                                      isCompleted
                                        ? 'border-green-200 bg-green-100 text-green-700'
                                        : 'border-yellow-200 bg-yellow-100 text-yellow-700'
                                    }`}
                                  >
                                    {isCompleted ? 'Completed' : 'In Progress'}
                                  </div>
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    {(session.generated_quizzes?.length || 0)} quizzes · {(session.generated_flashcards?.length || 0)} flashcards
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    {session.media_url ? (
                                      <a href={session.media_url} target="_blank" rel="noreferrer" className="underline">
                                        media file
                                      </a>
                                    ) : null}
                                    {session.notes_url ? (
                                      <a href={session.notes_url} target="_blank" rel="noreferrer" className="underline">
                                        notes file
                                      </a>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="flex w-[92px] shrink-0 flex-col items-center justify-center border-l border-dashed border-primary/20 bg-primary/5 p-3 transition-colors duration-200 group-hover:bg-primary/10">
                                  <p className="text-2xl font-semibold leading-none">
                                    {createdAt.toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: false,
                                    })}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {createdAt.toLocaleDateString('en-US', {
                                      day: '2-digit',
                                      month: 'short',
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );

                          if (batchDeleteMode) {
                            return <div key={session.id}>{ticketCard}</div>;
                          }

                          return (
                            <Link key={session.id} href={`/lecture-notes/${session.id}`} className="block rounded-xl">
                              {ticketCard}
                            </Link>
                          );
                        })}
                    </div>
                  )}
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
    </div>
  );
}
