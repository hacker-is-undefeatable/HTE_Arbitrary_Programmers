'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function RevisionPage() {
  const { user } = useAuth();
  const [revision, setRevision] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today'>('all');

  useEffect(() => {
    if (user?.id) {
      const fetchRevision = async () => {
        const isOverdue = filter === 'overdue' ? '?isOverdue=true' : '';
        const res = await fetch(`/api/revision-schedule?userId=${user.id}${isOverdue}`);
        const data = await res.json();
        setRevision(data);
        setLoading(false);
      };
      fetchRevision();
    }
  }, [user?.id, filter]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-primary hover:underline mb-8 inline-block">
          ← Back to Dashboard
        </Link>

        <h1 className="text-4xl font-bold mb-8">Revision Schedule</h1>

        {/* Filters */}
        <div className="flex gap-2 mb-8">
          {['all', 'overdue', 'today'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as 'all' | 'overdue' | 'today')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-white border border-slate-200 hover:border-slate-300'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Revision Items */}
        {revision.length > 0 ? (
          <div className="space-y-4">
            {revision.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1 capitalize">
                        {item.topic.replace('-', ' ')} ({item.subject})
                      </h3>
                      <p className="text-sm text-slate-600 mb-2">
                        Next revision: {new Date(item.next_revision_date).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                          Priority: {Math.round(item.priority_score)}
                        </span>
                        {new Date(item.next_revision_date) <= new Date() && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/learn/${item.subject}?topic=${item.topic}`}
                      className="ml-4"
                    >
                      <Button>Start Revision</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-slate-600 mb-4">No revisions scheduled</p>
              <Link href="/dashboard">
                <Button>Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Smart Insights */}
        {revision.length > 0 && (
          <Card className="mt-12 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle>📊 Revision Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                You have <strong>{revision.length}</strong> topics in your revision schedule.
              </p>
              <p>
                Topics with higher priority scores need more attention to improve your mastery.
              </p>
              <p>
                💡 Tip: Focus on revising overdue topics first to strengthen weak areas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
