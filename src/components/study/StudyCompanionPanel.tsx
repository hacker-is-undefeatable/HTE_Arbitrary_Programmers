'use client';

import { useEffect, useState } from 'react';
import type { Profile } from '@/types';

type HeartbeatResponse = {
  burnoutRisk: number;
  burnoutLevel: 'low' | 'medium' | 'high';
  contributingFactors: string[];
  coachMessage: string;
  shouldSuggestBreak: boolean;
  suggestedBreakMinutes: number | null;
  psyFact: string;
};

type StudyCompanionPanelProps = {
  profile: Profile;
};

export function StudyCompanionPanel({ profile }: StudyCompanionPanelProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<HeartbeatResponse | null>(null);
  const [sessionStart] = useState(() => Date.now());
  const [lastInteractionAt, setLastInteractionAt] = useState(() => Date.now());
  const [rantText, setRantText] = useState('');
  const [rantReply, setRantReply] = useState<string | null>(null);
  const [rantLoading, setRantLoading] = useState(false);
  const [popCount, setPopCount] = useState(0);
  const [popActive, setPopActive] = useState(false);
  const [totalPops, setTotalPops] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<
    { userId: string; name: string | null; totalPops: number }[]
  >([]);

  useEffect(() => {
    const handler = () => setLastInteractionAt(Date.now());

    window.addEventListener('click', handler);
    window.addEventListener('keydown', handler);
    window.addEventListener('mousemove', handler);
    document.addEventListener('visibilitychange', handler);

    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('mousemove', handler);
      document.removeEventListener('visibilitychange', handler);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = () => {
      if (cancelled) return;
      // Randomize next heartbeat between ~45s and ~75s
      const jitterMs = 45_000 + Math.random() * 30_000;
      timeoutId = setTimeout(sendHeartbeat, jitterMs);
    };

    const sendHeartbeat = async () => {
      const now = Date.now();
      const sessionMinutes = (now - sessionStart) / 60000;
      const idleSecondsRaw = (now - lastInteractionAt) / 1000;
      const idleSecondsLast10Min = Math.min(Math.max(idleSecondsRaw, 0), 600);

      try {
        const res = await fetch('/api/study-companion/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionMinutes,
            totalMinutesToday: 0,
            idleSecondsLast10Min,
            accuracyLastWindow: null,
            accuracyPrevWindow: null,
            avgTimePerQuestionCurrent: null,
            avgTimePerQuestionBaseline: null,
            hintsLastWindow: 0,
            selfReportedTiredness: 0,
            profile,
            subject: profile.role === 'high_school' ? 'math' : 'python',
          }),
        });

        if (!res.ok || cancelled) return;
        const json = (await res.json()) as HeartbeatResponse;
        if (!cancelled) {
          setData(json);
        }
      } catch {
        // ignore network errors for now
      } finally {
        scheduleNext();
      }
    };

    // send immediately, then on a randomized cadence
    sendHeartbeat();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [lastInteractionAt, profile, sessionStart]);

  useEffect(() => {
    let cancelled = false;

    const fetchPopStats = async () => {
      try {
        const res = await fetch(`/api/pop-stats?userId=${profile.id}`);
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          userTotalPops: number;
          leaderboard: { userId: string; name: string | null; totalPops: number }[];
        };
        if (!cancelled) {
          setTotalPops(json.userTotalPops ?? 0);
          setLeaderboard(json.leaderboard ?? []);
        }
      } catch {
        // ignore for now
      }
    };

    fetchPopStats();

    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  const statusLabel =
    data?.burnoutLevel === 'high'
      ? 'Energy: Low'
      : data?.burnoutLevel === 'medium'
      ? 'Energy: Warming down'
      : 'Energy: Good';

  const statusColorClasses =
    data?.burnoutLevel === 'high'
      ? 'bg-red-100 text-red-800 border-red-200'
      : data?.burnoutLevel === 'medium'
      ? 'bg-amber-100 text-amber-900 border-amber-200'
      : 'bg-emerald-100 text-emerald-900 border-emerald-200';

  const statusExplanation =
    data?.burnoutLevel === 'high'
      ? 'You may be pushing pretty hard right now. A real break could help you come back sharper.'
      : data?.burnoutLevel === 'medium'
      ? "You're still okay, but your focus is starting to dip. A short stretch or water break could help."
      : 'Your focus pattern looks healthy at the moment. You probably do not need a break yet.';

  const handleRantSubmit = async () => {
    const text = rantText.trim();
    if (!text || rantLoading) return;
    setRantLoading(true);
    setRantReply(null);

    try {
      const res = await fetch('/api/study-companion/rant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, profile }),
      });

      if (res.ok) {
        const json = (await res.json()) as { reply: string };
        setRantReply(json.reply);
      } else {
        setRantReply(
          "Thanks for sharing that with me. Even when it feels heavy, you're still showing up—that matters."
        );
      }
    } catch {
      setRantReply(
        "I can't reach the server right now, but I did read what you wrote. It's okay to feel how you feel about studying."
      );
    } finally {
      setRantLoading(false);
    }
  };

  const handlePopClick = () => {
    setPopCount((c) => c + 1);
    setPopActive(true);
    setTimeout(() => setPopActive(false), 120);
    setTotalPops((prev) => (prev === null ? 1 : prev + 1));

    void (async () => {
      try {
        const res = await fetch('/api/pop-stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: profile.id, increment: 1 }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { userTotalPops?: number };
        if (typeof json.userTotalPops === 'number') {
          setTotalPops(json.userTotalPops);
        }
      } catch {
        // ignore errors, local optimistic value still shows
      }
    })();
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full bg-primary text-primary-foreground px-4 py-2 shadow-lg text-sm"
      >
        Study Companion
      </button>

      {open && data && (
        <div className="mt-2 w-80 rounded-xl border bg-background shadow-xl p-4 space-y-3 text-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">Energy &amp; Focus</div>
              <div
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusColorClasses}`}
              >
                {statusLabel} ({data.burnoutLevel.toUpperCase()})
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{statusExplanation}</p>
          </div>

          <p className="text-sm">{data.coachMessage}</p>

          <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
            <span className="font-semibold">Did you know? </span>
            {data.psyFact}
          </div>

          {data.shouldSuggestBreak && (
            <div className="rounded-md bg-amber-50 p-2 text-xs text-amber-900 border border-amber-200">
              Consider a
              {data.suggestedBreakMinutes
                ? ` ${data.suggestedBreakMinutes}-minute`
                : ' short'}{' '}
              break to recharge before continuing.
            </div>
          )}

          <div className="border-t pt-3 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">
              Rant space
            </div>
            <textarea
              value={rantText}
              onChange={(e) => setRantText(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
              placeholder="Dump your thoughts about studying here. No need to be polite."
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleRantSubmit}
                disabled={rantLoading || !rantText.trim()}
                className="rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background disabled:opacity-60"
              >
                {rantLoading ? 'Listening...' : 'Send rant'}
              </button>
              <div className="text-[10px] text-muted-foreground">
                I respond with empathy, not judgment.
              </div>
            </div>
            {rantReply && (
              <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
                {rantReply}
              </div>
            )}
          </div>

          <div className="border-t pt-3 flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground">
              Tiny brain break
            </div>
            <button
              type="button"
              onClick={handlePopClick}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-transform ${
                popActive ? 'scale-110' : 'scale-100'
              }`}
            >
              POP {popCount > 0 && `x${popCount}`}
            </button>
          </div>

          {totalPops !== null && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              Your lifetime pops:{' '}
              <span className="font-semibold">{totalPops}</span>
            </div>
          )}

          {leaderboard.length > 0 && (
            <div className="mt-2 rounded-md bg-muted/30 p-2 text-[11px] text-muted-foreground space-y-1">
              <div className="text-xs font-semibold">Pop leaderboard</div>
              {leaderboard.map((row, index) => (
                <div key={row.userId} className="flex items-center justify-between">
                  <span>
                    #{index + 1}{' '}
                    {row.userId === profile.id
                      ? 'You'
                      : row.name || 'Anonymous'}
                  </span>
                  <span className="font-semibold">{row.totalPops}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

