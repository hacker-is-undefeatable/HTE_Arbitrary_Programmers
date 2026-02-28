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
  TrendingUp,
  TrendingDown,
  Check,
  Clock3,
} from 'lucide-react';

const MENU_ITEMS = [
  { label: 'Learning', href: '/learning' },
  { label: 'Lecture Notes', href: '/lecture-notes' },
  { label: 'Quizzes', href: '/quizzes' },
  { label: 'Flash cards', href: '/flash-cards' },
];

const CHART_X_LABELS = ['Apr 7', 'Apr 13', 'Apr 19', 'Apr 26', 'May 2', 'May 8', 'May 14', 'May 21', 'May 28', 'Jun 3', 'Jun 9', 'Jun 15', 'Jun 22', 'Jun 30'];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id || null);
  const { scores, loading: scoresLoading } = useMasteryScores(user?.id || null);
  const [revisionItems, setRevisionItems] = useState<any[]>([]);

  const avgMastery = useMemo(() => calculateAverageMastery(scores), [scores]);
  const topScores = useMemo(() => [...scores].sort((left, right) => right.mastery_score - left.mastery_score).slice(0, 6), [scores]);

  const chartSeries = useMemo(() => {
    const points = Array.from({ length: 30 }, (_, index) => {
      const base = scores[index % (scores.length || 1)]?.mastery_score ?? avgMastery;
      const wave = Math.sin(index * 1.4) * 12 + Math.cos(index * 0.45) * 8;
      const value = Math.max(20, Math.min(95, Math.round(base + wave)));
      return value;
    });

    const max = Math.max(...points, 100);
    const desktopPoints = points
      .map((value, index) => {
        const x = (index / (points.length - 1)) * 100;
        const y = 100 - (value / max) * 85;
        return `${x},${y}`;
      })
      .join(' ');

    const mobilePoints = points
      .map((value, index) => {
        const x = (index / (points.length - 1)) * 100;
        const y = 100 - (value / max) * 70;
        return `${x},${y}`;
      })
      .join(' ');

    return {
      desktopArea: `0,100 ${desktopPoints} 100,100`,
      desktopLine: desktopPoints,
      mobileArea: `0,100 ${mobilePoints} 100,100`,
      mobileLine: mobilePoints,
    };
  }, [scores, avgMastery]);

  const kpiCards = useMemo(() => {
    const revenue = (avgMastery * 17.86 + scores.length * 24).toFixed(2);
    const customerDelta = avgMastery > 60 ? '+12.5%' : '-8.1%';
    const growthDelta = revisionItems.length > 0 ? '+4.5%' : '+1.3%';

    return [
      {
        label: 'Total Revenue',
        value: `$${revenue}`,
        delta: customerDelta,
        note: 'Trending up this month',
        sub: 'Visitors for the last 6 months',
        trendUp: customerDelta.startsWith('+'),
      },
      {
        label: 'New Customers',
        value: `${scores.length * 13 + 10}`,
        delta: '-20%',
        note: 'Down 20% this period',
        sub: 'Acquisition needs attention',
        trendUp: false,
      },
      {
        label: 'Active Accounts',
        value: `${Math.max(scores.length * 127, 1200)}`,
        delta: '+12.5%',
        note: 'Strong user retention',
        sub: 'Engagement exceed targets',
        trendUp: true,
      },
      {
        label: 'Growth Rate',
        value: `${Math.max(avgMastery / 18, 2).toFixed(1)}%`,
        delta: growthDelta,
        note: 'Steady performance increase',
        sub: 'Meets growth projections',
        trendUp: true,
      },
    ];
  }, [avgMastery, scores.length, revisionItems.length]);

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
              Complete your profile first, then take your diagnostic assessment to personalize your learning path.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Link href="/diagnostic-setup" className="w-full sm:w-auto">
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

          <Button className="mt-6 justify-start rounded-lg bg-foreground text-background hover:bg-foreground/90">
            <Plus className="mr-2 h-4 w-4" />
            Quick Create
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
              <h1 className="text-sm font-medium sm:text-base">Documents</h1>
              <div className="text-sm text-muted-foreground">GitHub</div>
            </div>

            <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {kpiCards.map((metric) => (
                  <Card key={metric.label} className="rounded-xl shadow-none">
                    <CardHeader className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <CardDescription>{metric.label}</CardDescription>
                        <div className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                          {metric.trendUp ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                          {metric.delta}
                        </div>
                      </div>
                      <CardTitle className="text-4xl font-semibold tracking-tight">{metric.value}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 p-4 pt-0 text-sm">
                      <p className="font-medium">{metric.note}</p>
                      <p className="text-muted-foreground">{metric.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="rounded-xl shadow-none">
                <CardHeader className="flex flex-row items-start justify-between gap-3 p-4">
                  <div>
                    <CardTitle className="text-xl">Total Visitors</CardTitle>
                    <CardDescription>Total for the last 3 months</CardDescription>
                  </div>
                  <div className="inline-flex rounded-md border bg-muted/30 p-1 text-sm">
                    <button type="button" className="rounded-sm bg-background px-3 py-1 font-medium shadow-sm">Last 3 months</button>
                    <button type="button" className="rounded-sm px-3 py-1 text-muted-foreground">Last 30 days</button>
                    <button type="button" className="rounded-sm px-3 py-1 text-muted-foreground">Last 7 days</button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                  <div className="h-[270px] w-full rounded-lg border bg-muted/20 p-3">
                    <svg viewBox="0 0 100 100" className="h-full w-full text-muted-foreground" preserveAspectRatio="none">
                      <line x1="0" y1="82" x2="100" y2="82" className="stroke-border" strokeWidth="0.3" />
                      <line x1="0" y1="60" x2="100" y2="60" className="stroke-border" strokeWidth="0.3" />
                      <line x1="0" y1="40" x2="100" y2="40" className="stroke-border" strokeWidth="0.3" />
                      <line x1="0" y1="20" x2="100" y2="20" className="stroke-border" strokeWidth="0.3" />
                      <polygon points={chartSeries.desktopArea} className="fill-foreground/15" />
                      <polyline points={chartSeries.desktopLine} className="fill-none stroke-foreground/80" strokeWidth="0.5" />
                    </svg>
                  </div>

                  <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground sm:grid-cols-14">
                    {CHART_X_LABELS.map((label) => (
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
                      {(topScores.length > 0 ? topScores : [{ topic: 'Diagnostic pending', mastery_score: avgMastery }]).map((score, index) => (
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
