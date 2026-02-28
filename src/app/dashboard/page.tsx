'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useMasteryScores } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateAverageMastery, categorizeMasteryTopics, categorizeMastery } from '@/utils/masteryEngine';
import { getTodayRevisionItems } from '@/utils/revisionEngine';
import Link from 'next/link';

// Memoized revision item component
const RevisionItem = memo(({ item }: { item: any }) => (
  <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
    <div>
      <p className="font-medium">{item.topic}</p>
      <p className="text-sm text-slate-600">Priority: {Math.round(item.priority_score)}</p>
    </div>
    <Link href={`/learn/${item.subject}?topic=${item.topic}`}>
      <Button size="sm">Start</Button>
    </Link>
  </div>
));
RevisionItem.displayName = 'RevisionItem';

// Memoized topic item component
const TopicItem = memo(({ topic }: { topic: string }) => (
  <div className="p-2 bg-green-50 rounded text-sm">
    ✓ {topic}
  </div>
));
TopicItem.displayName = 'TopicItem';

// Memoized score item component
const ScoreItem = memo(({ score }: { score: any }) => {
  const { color } = categorizeMastery(score.mastery_score);
  const bgColor = color === 'red' ? 'bg-red-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500';
  
  return (
    <div key={score.id}>
      <div className="flex justify-between mb-2">
        <span className="font-medium">{score.topic}</span>
        <span className="text-sm font-bold text-primary">{score.mastery_score}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${bgColor}`} style={{ width: `${score.mastery_score}%` }} />
      </div>
    </div>
  );
});
ScoreItem.displayName = 'ScoreItem';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id || null);
  const { scores, loading: scoresLoading } = useMasteryScores(user?.id || null);
  const [revisionItems, setRevisionItems] = useState<any[]>([]);
  const [displayedScores, setDisplayedScores] = useState<any[]>([]);
  const [showAllScores, setShowAllScores] = useState(false);

  // Memoized expensive calculations
  const avgMastery = useMemo(() => calculateAverageMastery(scores), [scores]);
  const { weak, developing, strong } = useMemo(() => categorizeMasteryTopics(scores), [scores]);
  const subject = useMemo(() => (profile?.role === 'high_school' ? 'Math' : 'Python'), [profile?.role]);

  // Fetch revision items
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

  // Lazy load scores - only display first 10 initially
  useEffect(() => {
    if (!showAllScores) {
      setDisplayedScores(scores.slice(0, 10));
    } else {
      setDisplayedScores(scores);
    }
  }, [scores, showAllScores]);

  const handleShowAllScores = useCallback(() => {
    setShowAllScores(true);
  }, []);

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
    router.push('/login');
    return null;
  }

  if (!profile) {
    // Redirect to diagnostic setup if profile doesn't exist
    router.push('/diagnostic-setup');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">Welcome, {profile.name}!</h1>
            <p className="text-slate-600">
              {profile.role === 'high_school' ? 'High School ' : 'College '}Research • {subject}
            </p>
          </div>
          <Link href="/settings">
            <Button variant="outline">Settings</Button>
          </Link>
        </div>

        {/* Overall Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
            <CardDescription>Your average mastery level across all topics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div className="text-5xl font-bold text-primary">{avgMastery}%</div>
                <div className="text-right text-slate-600">
                  <p>{scores.length} topics tracked</p>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all"
                  style={{ width: `${avgMastery}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <Link href={profile.role === 'high_school' ? '/learn/math' : '/learn/python'}>
            <Button className="w-full h-12 text-lg">📚 Continue Learning</Button>
          </Link>
          <Link href="/revision">
            <Button variant="outline" className="w-full h-12 text-lg">
              🔄 Revision Time
            </Button>
          </Link>
        </div>

        {/* Today's Revision */}
        {revisionItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>📅 Today's Revision</CardTitle>
              <CardDescription>Topics you should revise today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {revisionItems.map((item) => (
                  <RevisionItem key={item.id} item={item} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mastery by Category */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Strong Topics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Strong (75+)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {strong.length > 0 ? (
                  strong.map((topic) => (
                    <TopicItem key={topic} topic={topic} />
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Keep practicing to unlock!</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Developing Topics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Developing (50-75)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {developing.length > 0 ? (
                  developing.map((topic) => (
                    <div key={topic} className="p-2 bg-yellow-50 rounded text-sm">
                      ◐ {topic}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Keep practicing!</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weak Topics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weak (&lt;50)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {weak.length > 0 ? (
                  weak.map((topic) => (
                    <div key={topic} className="p-2 bg-red-50 rounded text-sm">
                      ⚠ {topic}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">You're doing great!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Individual Topic Scores */}
        <Card>
          <CardHeader>
            <CardTitle>Mastery Scores by Topic</CardTitle>
            <CardDescription>Detailed breakdown of your progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayedScores.length > 0 ? (
                <>
                  {displayedScores.map((score) => (
                    <ScoreItem key={score.id} score={score} />
                  ))}
                  {!showAllScores && scores.length > 10 && (
                    <button
                      onClick={handleShowAllScores}
                      className="w-full mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Show all ({scores.length - 10} more)
                    </button>
                  )}
                </>
              ) : (
                <p className="text-slate-600">Complete the diagnostic to see your scores.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
