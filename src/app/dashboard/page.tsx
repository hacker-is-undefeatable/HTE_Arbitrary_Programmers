'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useMasteryScores } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateAverageMastery } from '@/utils/masteryEngine';
import { getTodayRevisionItems } from '@/utils/revisionEngine';
import Link from 'next/link';
import {
  Circle,
  Settings,
  HelpCircle,
  UserCircle,
  LogOut,
  Plus,
  Columns,
  ChevronDown,
  Check,
  Clock3,
} from 'lucide-react';

const MENU_ITEMS = [
  { label: 'Learning', href: '/learning' },
  { label: 'Lecture Notes', href: '/lecture-notes' },
  { label: 'Quizzes', href: '/quizzes' },
  { label: 'Flash cards', href: '/flash-cards' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id || null);
  const { scores, loading: scoresLoading } = useMasteryScores(user?.id || null);
  const [revisionItems, setRevisionItems] = useState<any[]>([]);
  const [lectureSessions, setLectureSessions] = useState<any[]>([]);
  const [revisionTimeLogs, setRevisionTimeLogs] = useState<any[]>([]);

  const avgMastery = useMemo(() => calculateAverageMastery(scores), [scores]);
  const topScores = useMemo(() => [...scores].sort((left, right) => right.mastery_score - left.mastery_score).slice(0, 6), [scores]);

  const revisionChart = useMemo(() => {
    const days = 14;
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
    const cards = lectureSessions.slice(0, 4).map((session) => ({
      label: session.lecture_title || 'Untitled Lecture',
      value: `${(session.generated_quizzes || []).length} quizzes`,
      note: `${(session.generated_flashcards || []).length} flashcards generated`,
      sub: `Created ${new Date(session.created_at).toLocaleDateString()}`,
    }));

    while (cards.length < 4) {
      cards.push({
        label: 'No lecture yet',
        value: '0 quizzes',
        note: 'Create a lecture using Quick Create',
        sub: 'Saved sessions from Supabase will appear here',
      });
    }

    return cards;
  }, [lectureSessions]);

  useEffect(() => {
    if (user?.id && !scoresLoading) {
      const fetchRevision = async () => {
        try {
          const res = await fetch(`/api/revision-schedule?userId=${user.id}`);
          if (!res.ok) {
            console.warn('Failed to fetch revision schedule:', res.status);
            setRevisionItems([]);
            return;
          }
          const data = await res.json();
          const today = getTodayRevisionItems(data);
          setRevisionItems(today);
        } catch (error) {
          console.warn('Error fetching revision schedule:', error);
          setRevisionItems([]);
        }
      };
      fetchRevision();
    }
  }, [user?.id, scoresLoading]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchSessionData = async () => {
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

  if (authLoading || profileLoading || scoresLoading) {
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

          <div className="mt-4 space-y-1">
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex w-full items-center rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <span>{item.label}</span>
              </Link>
            ))}
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
              <h1 className="text-sm font-medium sm:text-base">Dashboards</h1>
              <div className="text-sm text-muted-foreground">???</div>
            </div>

            <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {lectureCards.map((lecture, index) => (
                  <Card key={`${lecture.label}-${index}`} className="rounded-xl shadow-none">
                    <CardHeader className="space-y-2 p-4">
                      <CardDescription>{lecture.label}</CardDescription>
                      <CardTitle className="text-3xl font-semibold tracking-tight">{lecture.value}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 p-4 pt-0 text-sm">
                      <p className="font-medium">{lecture.note}</p>
                      <p className="text-muted-foreground">{lecture.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

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

                  <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground sm:grid-cols-14">
                    {revisionChart.labels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-1 rounded-md border bg-muted/20 p-1 text-sm">
                    <Link href="/learning" className="rounded-sm bg-background px-3 py-1 shadow-sm">Learning</Link>
                    <Link href="/lecture-notes" className="rounded-sm px-3 py-1 text-muted-foreground">Lecture Notes</Link>
                    <Link href="/quizzes" className="rounded-sm px-3 py-1 text-muted-foreground">Quizzes</Link>
                    <Link href="/flash-cards" className="rounded-sm px-3 py-1 text-muted-foreground">Flash cards</Link>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9">
                      <Columns className="mr-2 h-4 w-4" />
                      Customize Columns
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-9">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Section
                    </Button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-muted-foreground">
                      <tr className="text-left">
                        <th className="px-3 py-2 font-medium">Header</th>
                        <th className="px-3 py-2 font-medium">Section Type</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Target</th>
                        <th className="px-3 py-2 font-medium">Limit</th>
                        <th className="px-3 py-2 font-medium">Reviewer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(topScores.length > 0 ? topScores : [{ topic: 'Profile setup pending', mastery_score: avgMastery }]).map((score, index) => (
                        <tr key={`${score.topic}-${index}`} className="border-t">
                          <td className="px-3 py-3">{score.topic}</td>
                          <td className="px-3 py-3">
                            <span className="rounded-full border px-2 py-1 text-xs">{profile.role === 'high_school' ? 'Math' : 'Python'}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs">
                              {score.mastery_score >= 70 ? (
                                <>
                                  <Check className="mr-1 h-3 w-3" />
                                  Completed
                                </>
                              ) : (
                                <>
                                  <Clock3 className="mr-1 h-3 w-3" />
                                  In Process
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-3">{score.mastery_score}%</td>
                          <td className="px-3 py-3">100%</td>
                          <td className="px-3 py-3">{profile.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {revisionItems.length > 0 && (
                  <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
                    Next revision queue: {revisionItems.slice(0, 3).map((item) => item.topic).join(' • ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
