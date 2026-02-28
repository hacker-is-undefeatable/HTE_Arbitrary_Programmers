'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';

type QuizItem = {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
};

type FlashcardItem = {
  front: string;
  back: string;
};

type SessionItem = {
  id: string;
  lecture_title: string;
  summary: string | null;
  transcript: string | null;
  media_url: string | null;
  notes_url: string | null;
  created_at: string;
  generated_quizzes: QuizItem[];
  generated_flashcards: FlashcardItem[];
};

const CODE_REGEX = /^[A-Za-z0-9]*$/;

function QuizPartyModal({
  open,
  onClose,
  sessionId,
  sessionTitle,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle: string;
  userId: string | null;
}) {
  const [step, setStep] = useState<'config' | 'lobby' | 'join' | 'playing' | 'ended'>('config');
  const [mode, setMode] = useState<'host' | 'join'>('host');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [joinCode, setJoinCode] = useState('');
  const [joinCodeError, setJoinCodeError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [serverId, setServerId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [guestTagDataUri, setGuestTagDataUri] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Array<{ display_name: string; guest: boolean; guest_tag_data_uri?: string; score: number }>>([]);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ current_question_index: number; total_questions: number; current_question?: { question_text: string; choices: string[]; question_index: number } } | null>(null);
  const [answerSent, setAnswerSent] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [correctAnswerText, setCorrectAnswerText] = useState<string | null>(null);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(0);
  const [configError, setConfigError] = useState('');
  const [loading, setLoading] = useState(false);
  const [explainLoading, setExplainLoading] = useState<number | null>(null);
  const [detailedExplain, setDetailedExplain] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isHost = mode === 'host' && !!serverId;

  const fetchStatus = useCallback(async (sid: string) => {
    const res = await fetch(`/api/quiz/status?server_id=${encodeURIComponent(sid)}`);
    if (!res.ok) return null;
    return res.json();
  }, []);

  const fetchLeaderboard = useCallback(async (sid: string) => {
    const res = await fetch(`/api/quiz/leaderboard?server_id=${encodeURIComponent(sid)}`);
    if (!res.ok) return;
    const data = await res.json();
    setLeaderboard(data.leaderboard || []);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep('config');
    setMode('host');
    setServerId(null);
    setInviteCode('');
    setParticipantId(null);
    setQuizId(null);
    setStatus(null);
    setJoinCodeError('');
    setConfigError('');
  }, [open]);

  useEffect(() => {
    if (!open || !serverId) return;
    const poll = () => {
      fetchStatus(serverId).then((s) => {
        if (!s) return;
        if (s.quiz_id) setQuizId((prev) => prev || s.quiz_id);
        if (s.status === 'ended') {
          setStep('ended');
          setStatus((prev) => (prev ? { ...prev, current_question_index: s.current_question_index, total_questions: s.total_questions } : null));
          fetchLeaderboard(serverId);
          if (pollRef.current) clearInterval(pollRef.current);
          return;
        }
        setStatus({
          current_question_index: s.current_question_index,
          total_questions: s.total_questions,
          current_question: s.current_question,
        });
        if (s.status === 'active') {
          setStep((prev) => (prev === 'lobby' ? 'playing' : prev));
          setQuestionTimeRemaining(30);
          fetchLeaderboard(serverId);
        }
      });
    };
    pollRef.current = setInterval(poll, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, serverId, fetchStatus, fetchLeaderboard]);

  useEffect(() => {
    if (questionTimeRemaining <= 0 || !status?.current_question) return;
    timerRef.current = setInterval(() => setQuestionTimeRemaining((t) => Math.max(0, t - 1)), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [questionTimeRemaining, status?.current_question]);

  const handleStartServer = async () => {
    if (maxPlayers < 2 || maxPlayers > 100) {
      setConfigError('Max players must be between 2 and 100.');
      return;
    }
    if (durationMinutes < 5 || durationMinutes > 120) {
      setConfigError('Duration must be between 5 and 120 minutes.');
      return;
    }
    setConfigError('');
    setLoading(true);
    try {
      const res = await fetch('/api/quiz/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_players: maxPlayers,
          duration_minutes: durationMinutes,
          session_id: sessionId,
          user_id: userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create server');
      setServerId(data.server_id);
      setInviteCode(data.invite_code);
      setStep('lobby');
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : 'Failed to create server');
    } finally {
      setLoading(false);
    }
  };

  const handleBeginQuiz = async () => {
    if (!serverId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_id: serverId, session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start quiz');
      setQuizId(data.quiz_id);
      setStep('playing');
      setStatus({ current_question_index: 0, total_questions: data.question_count || 0 });
      setQuestionTimeRemaining(30);
      setAnswerSent(false);
      setExplanation(null);
      setCorrectAnswerText(null);
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : 'Failed to start quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const raw = joinCode.trim();
    if (raw.length !== 6) {
      setJoinCodeError('Invite code must be exactly 6 characters.');
      return;
    }
    const upper = raw.toUpperCase();
    if (!CODE_REGEX.test(raw)) {
      setJoinCodeError('Invite code may only contain letters A–Z and digits 0–9. No spaces or punctuation.');
      return;
    }
    setJoinCodeError('');
    setLoading(true);
    try {
      const res = await fetch('/api/quiz/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: upper,
          display_name: displayName.trim() || (userId ? 'Player' : 'Guest'),
          user_id: userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join');
      setServerId(data.quiz_server_id);
      setParticipantId(data.participant_id);
      setGuestTagDataUri(data.guest_tag_data_uri || null);
      setIsGuest(data.guest === true);
      setStep('lobby');
      setInviteCode(upper);
    } catch (e) {
      setJoinCodeError(e instanceof Error ? e.message : 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (choiceIndex: number) => {
    if (!serverId || !participantId || answerSent) return;
    setAnswerSent(true);
    const timeMs = (30 - questionTimeRemaining) * 1000;
    const qIndex = status?.current_question_index ?? 0;
    try {
      await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server_id: serverId,
          participant_id: participantId,
          question_index: qIndex,
          choice_index: choiceIndex,
          time_ms: timeMs,
        }),
      });
    } catch (_) {}
    fetchLeaderboard(serverId);
    const qId = quizId;
    if (qId) {
      fetch(`/api/quiz/question/${qId}/${qIndex}`)
        .then((r) => r.ok ? r.json() : null)
        .then((q) => {
          if (q) {
            setExplanation(q.explanation ?? null);
            const choices = Array.isArray(q.choices) ? q.choices : [];
            const idx = Number(q.correct_choice_index);
            setCorrectAnswerText(choices[idx] ?? null);
          }
        });
    }
  };

  const handleAdvance = async () => {
    if (!serverId) return;
    try {
      const res = await fetch('/api/quiz/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_id: serverId }),
      });
      const data = await res.json();
      if (res.ok && data.quiz_ended) {
        setStep('ended');
        fetchLeaderboard(serverId);
      } else {
        setQuestionTimeRemaining(30);
        setAnswerSent(false);
        setExplanation(null);
        setCorrectAnswerText(null);
      }
    } catch (_) {}
  };

  const handleDownload = () => {
    if (!quizId) return;
    const url = `/api/quiz/download/${quizId}?format=json&user_id=${encodeURIComponent(userId || '')}&guest_display_name=${encodeURIComponent(isGuest ? displayName : '')}`;
    window.open(url, '_blank');
  };

  const handleSave = async () => {
    if (!quizId || !userId) return;
    try {
      await fetch(`/api/quiz/save/${quizId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
    } catch (_) {}
  };

  const handleExplain = async (qIndex: number) => {
    if (!quizId || !userId) return;
    setExplainLoading(qIndex);
    setDetailedExplain(null);
    try {
      const res = await fetch(`/api/quiz/explain/${quizId}/${qIndex}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (res.ok) setDetailedExplain(data.detailed_explanation || '');
    } catch (_) {}
    setExplainLoading(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => onClose()}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-lg font-semibold">Quiz Party</h2>
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={onClose}>Close</button>
        </div>

        {step === 'config' && (
          <>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className={`rounded px-3 py-1.5 text-sm ${mode === 'host' ? 'bg-muted' : ''}`}
                onClick={() => { setMode('host'); setJoinCodeError(''); }}
              >
                Host a Quiz
              </button>
              <button
                type="button"
                className={`rounded px-3 py-1.5 text-sm ${mode === 'join' ? 'bg-muted' : ''}`}
                onClick={() => { setMode('join'); setConfigError(''); }}
              >
                Join a Quiz
              </button>
            </div>
            {mode === 'host' && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">Create a quiz from: {sessionTitle}</p>
                <label className="block text-sm">Max players (2–100)</label>
                <Input
                  type="number"
                  min={2}
                  max={100}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value) || 2)}
                />
                <label className="block text-sm">Duration (minutes, 5–120)</label>
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value) || 5)}
                />
                {configError && <p className="text-sm text-red-600">{configError}</p>}
                <Button className="w-full" onClick={handleStartServer} disabled={loading}>
                  {loading ? 'Creating…' : 'Start server'}
                </Button>
              </div>
            )}
            {mode === 'join' && (
              <div className="mt-4 space-y-3">
                <label className="block text-sm">Invite code (6 letters or digits)</label>
                <Input
                  placeholder="e.g. ABC123"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || CODE_REGEX.test(v)) {
                      setJoinCode(v);
                      setJoinCodeError('');
                    }
                  }}
                />
                {!userId && (
                  <>
                    <label className="block text-sm">Your display name (guests)</label>
                    <Input
                      placeholder="Display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </>
                )}
                {joinCodeError && <p className="text-sm text-red-600">{joinCodeError}</p>}
                <Button className="w-full" onClick={handleJoin} disabled={loading}>
                  {loading ? 'Joining…' : 'Join'}
                </Button>
              </div>
            )}
          </>
        )}

        {step === 'lobby' && (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium">Invite code: <span className="tracking-widest">{inviteCode}</span></p>
            {isHost && (
              <Button className="w-full" onClick={handleBeginQuiz} disabled={loading}>
                {loading ? 'Starting…' : 'Begin Quiz'}
              </Button>
            )}
            {!isHost && <p className="text-sm text-muted-foreground">Waiting for host to start the quiz…</p>}
            <div className="max-h-32 overflow-auto">
              <p className="text-sm font-medium">Participants</p>
              {leaderboard.length === 0 && <p className="text-sm text-muted-foreground">No participants yet. Share the code.</p>}
              {leaderboard.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {p.guest && p.guest_tag_data_uri ? (
                    <img src={p.guest_tag_data_uri} alt="Guest" className="h-4 w-4 inline-block flex-shrink-0" />
                  ) : null}
                  <span>{p.display_name}</span>
                  <span className="text-muted-foreground">({p.score} pts)</span>
                </div>
              ))}
            </div>
            {!isHost && (
              <button type="button" className="text-sm text-muted-foreground underline" onClick={() => { setStep('config'); setServerId(null); setInviteCode(''); setParticipantId(null); }}>
                Leave and join another
              </button>
            )}
          </div>
        )}

        {step === 'playing' && status && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Question {status.current_question_index + 1} of {status.total_questions} · Time: {questionTimeRemaining}s
            </p>
            {status.current_question && !explanation && (
              <>
                <p className="font-medium">{status.current_question.question_text}</p>
                <div className="space-y-2">
                  {status.current_question.choices?.map((c: string, i: number) => (
                    <button
                      key={i}
                      type="button"
                      className="block w-full rounded border bg-muted/30 px-3 py-2 text-left text-sm hover:bg-muted/50 disabled:opacity-50"
                      onClick={() => handleSubmitAnswer(i)}
                      disabled={answerSent}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}
            {explanation && (
              <>
                {correctAnswerText && (
                  <p className="text-sm font-medium">Correct answer: {correctAnswerText}</p>
                )}
                <p className="text-sm text-muted-foreground">Explanation:</p>
                <p className="text-sm">{explanation}</p>
                {isHost && (
                  <Button className="w-full" onClick={handleAdvance}>Next question</Button>
                )}
              </>
            )}
            <div className="max-h-24 overflow-auto border-t pt-2">
              <p className="text-sm font-medium">Leaderboard</p>
              {leaderboard.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {p.guest && p.guest_tag_data_uri ? (
                    <img src={p.guest_tag_data_uri} alt="Guest" className="h-4 w-4 inline-block flex-shrink-0" />
                  ) : null}
                  <span>{p.display_name}</span>
                  <span>{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'ended' && (
          <div className="mt-4 space-y-3">
            <p className="font-medium">Quiz ended</p>
            <div className="max-h-40 overflow-auto">
              {leaderboard.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {p.guest && p.guest_tag_data_uri ? (
                    <img src={p.guest_tag_data_uri} alt="Guest" className="h-4 w-4 inline-block flex-shrink-0" />
                  ) : null}
                  <span>{p.display_name}</span>
                  <span>{p.score} pts</span>
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={handleDownload}>Download quiz (JSON)</Button>
            {userId && (
              <>
                <Button variant="outline" className="w-full" onClick={handleSave}>Save to my account</Button>
                <p className="text-sm text-muted-foreground">Request a deeper explanation for any question (logged-in only):</p>
                {status && Array.from({ length: status.total_questions }, (_, i) => i).map((qIndex) => (
                  <button
                    key={qIndex}
                    type="button"
                    className="block w-full rounded border px-2 py-1 text-left text-sm"
                    onClick={() => handleExplain(qIndex)}
                    disabled={explainLoading === qIndex}
                  >
                    Explain question {qIndex + 1} {explainLoading === qIndex ? '…' : ''}
                  </button>
                ))}
                {detailedExplain && <div className="rounded border bg-muted/20 p-2 text-sm whitespace-pre-wrap">{detailedExplain}</div>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LectureSessionDetailPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState<SessionItem | null>(null);
  const [showSectionNav, setShowSectionNav] = useState(true);
  const [activeTab, setActiveTab] = useState('uploaded-files');
  const [quizPartyOpen, setQuizPartyOpen] = useState(false);
  const lastScrollYRef = useRef(0);

  // Open Quiz Party when navigating from Quick Create with ?openQuizParty=1
  useEffect(() => {
    if (!session) return;
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('openQuizParty') === '1') {
      setQuizPartyOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('openQuizParty');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [session]);

  const sectionTabs = [
    { key: 'uploaded-files', label: 'Uploaded Files' },
    { key: 'ai-summary', label: 'AI Summary' },
    { key: 'transcript', label: 'Transcript' },
    { key: 'generated-quizzes', label: 'Generated Quizzes' },
    { key: 'generated-flashcards', label: 'Generated Flashcards' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollYRef.current;
      const nearTop = currentScrollY < 80;

      setShowSectionNav(nearTop || !scrollingDown);
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      if (!user?.id || !sessionId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/quick-create?userId=${user.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load lecture session.');
        }

        const sessions: SessionItem[] = Array.isArray(data) ? data : [];
        const targetSession = sessions.find((item) => item.id === sessionId) || null;

        if (!targetSession) {
          setError('Lecture session not found.');
          setSession(null);
        } else {
          setSession(targetSession);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load lecture session.');
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [user?.id, sessionId]);

  const createdAt = useMemo(() => {
    if (!session?.created_at) return '';
    return new Date(session.created_at).toLocaleString();
  }, [session?.created_at]);

  return (
    <AppShell
      title={session?.lecture_title || 'Learning'}
      subtitle={createdAt ? `Created ${createdAt}` : 'View uploaded materials and AI-generated content'}
      outsideTopSlot={
        <div
          className={`sticky top-0 z-30 overflow-x-auto rounded-md border bg-background/95 p-1 backdrop-blur transition-transform duration-200 ${
            showSectionNav ? 'translate-y-0' : '-translate-y-[140%]'
          }`}
        >
          <div className="inline-flex min-w-full items-center gap-1 sm:min-w-max">
            {sectionTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap rounded-sm px-3 py-2 text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-sm text-muted-foreground">
          <Link href="/dashboard" className="underline">
            Back to dashboard
          </Link>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Loading lecture session...</CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-sm text-red-600">{error}</CardContent>
          </Card>
        ) : session ? (
          <>
            {activeTab === 'uploaded-files' && (
              <Card>
                <CardHeader>
                  <CardTitle>Uploaded Files</CardTitle>
                  <CardDescription>Lecture materials uploaded during quick create</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {session.media_url ? (
                    <p>
                      <a href={session.media_url} target="_blank" rel="noreferrer" className="underline">
                        Open media file
                      </a>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">No media file saved.</p>
                  )}

                  {session.notes_url ? (
                    <p>
                      <a href={session.notes_url} target="_blank" rel="noreferrer" className="underline">
                        Open notes file
                      </a>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">No notes file saved.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'ai-summary' && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm leading-6">
                    {session.summary || 'No summary was generated.'}
                  </div>
                  {session.summary && (
                    <div className="mt-4">
                      <Button onClick={() => setQuizPartyOpen(true)}>Start Quiz Party</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'transcript' && (
              <Card>
                <CardHeader>
                  <CardTitle>Transcript</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[280px] overflow-auto rounded-md border bg-muted/20 p-3 text-sm leading-6">
                    {session.transcript || 'No transcript was generated.'}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'generated-quizzes' && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Quizzes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {session.generated_quizzes?.length > 0 ? (
                    session.generated_quizzes.map((quiz, index) => (
                      <div key={`${quiz.question}-${index}`} className="rounded-md border bg-muted/20 p-3">
                        <p className="font-medium">
                          Q{index + 1}. {quiz.question}
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {quiz.options.map((option, optionIndex) => (
                            <li key={`${option}-${optionIndex}`}>• {option}</li>
                          ))}
                        </ul>
                        <p className="mt-2 text-sm">
                          <strong>Answer:</strong> {quiz.correct_answer}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No quizzes generated.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'generated-flashcards' && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Flashcards</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {session.generated_flashcards?.length > 0 ? (
                    session.generated_flashcards.map((flashcard, index) => (
                      <div key={`${flashcard.front}-${index}`} className="rounded-md border bg-muted/20 p-3">
                        <p className="font-medium">Front: {flashcard.front}</p>
                        <p className="mt-1 text-sm text-muted-foreground">Back: {flashcard.back}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No flashcards generated.</p>
                  )}
                </CardContent>
              </Card>
            )}
            <QuizPartyModal
              open={quizPartyOpen}
              onClose={() => setQuizPartyOpen(false)}
              sessionId={sessionId ?? ''}
              sessionTitle={session.lecture_title ?? 'Lecture'}
              userId={user?.id ?? null}
            />
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
