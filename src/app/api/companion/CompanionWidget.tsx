'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Send, MessageCircle } from 'lucide-react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type CompanionMood = 'idle' | 'walking' | 'talking' | 'thinking' | 'happy';

const COMPANION_SIZE = 80;
const BOTTOM_GAP = 16;
const WALK_STEP = 1.2;
const WALK_INTERVAL = 30;

const MOOD_EMOJI: Record<CompanionMood, string> = {
  idle: '🧍‍♀️',
  walking: '🚶‍♀️',
  talking: '🗣️',
  thinking: '🤔',
  happy: '💃',
};

const BUBBLE_MESSAGES = [
  'Need help? Ask me!',
  'I\'m here to help you study!',
  'Got a question?',
  'Let\'s learn together!',
  'Click me to chat!',
];

export default function CompanionWidget() {
  const [open, setOpen] = useState(false);
  const [posX, setPosX] = useState(80);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [mood, setMood] = useState<CompanionMood>('walking');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your study companion 🌟 Ask me anything about your courses, quizzes, or study tips!",
    },
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleText, setBubbleText] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [legPhase, setLegPhase] = useState(0);

  const walkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const legTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Walking animation
  useEffect(() => {
    if (open || isHovered) {
      setMood('idle');
      if (walkTimerRef.current) clearInterval(walkTimerRef.current);
      return;
    }

    setMood('walking');

    walkTimerRef.current = setInterval(() => {
      setPosX((prev) => {
        const maxX = typeof window !== 'undefined' ? window.innerWidth - COMPANION_SIZE - 16 : 300;
        const next = prev + WALK_STEP * direction;

        if (next >= maxX) {
          setDirection(-1);
          return maxX;
        }
        if (next <= 16) {
          setDirection(1);
          return 16;
        }
        return next;
      });
    }, WALK_INTERVAL);

    return () => {
      if (walkTimerRef.current) clearInterval(walkTimerRef.current);
    };
  }, [open, isHovered, direction]);

  // Leg animation (walking cycle)
  useEffect(() => {
    legTimerRef.current = setInterval(() => {
      setLegPhase((p) => (p + 1) % 4);
    }, 200);
    return () => {
      if (legTimerRef.current) clearInterval(legTimerRef.current);
    };
  }, []);

  // Random bubble popups
  useEffect(() => {
    if (open) return;

    const showRandomBubble = () => {
      const text = BUBBLE_MESSAGES[Math.floor(Math.random() * BUBBLE_MESSAGES.length)];
      setBubbleText(text);
      setShowBubble(true);

      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = setTimeout(() => setShowBubble(false), 3000);
    };

    const interval = setInterval(showRandomBubble, 8000);
    // Show bubble after 2 seconds on mount
    const initial = setTimeout(showRandomBubble, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(initial);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, [open]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setShowBubble(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const send = async () => {
    const question = input.trim();
    if (!question || sending) return;

    setError('');
    setMood('thinking');

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: question },
    ];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const response = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.slice(-12) }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to get a response.');

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply || "I couldn't respond right now. Try again!" },
      ]);
      setMood('happy');
      setTimeout(() => setMood('talking'), 1500);
      setTimeout(() => setMood('idle'), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setMood('idle');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Walking SVG character
  const WalkingCharacter = () => {
    const isWalking = mood === 'walking';
    const legSwing = isWalking ? Math.sin((legPhase / 4) * Math.PI * 2) * 12 : 0;
    const armSwing = isWalking ? Math.cos((legPhase / 4) * Math.PI * 2) * 10 : 0;
    const bodyBob = isWalking ? Math.abs(Math.sin((legPhase / 4) * Math.PI * 2)) * 2 : 0;

    const moodColor: Record<CompanionMood, string> = {
      idle: '#a78bfa',
      walking: '#818cf8',
      talking: '#34d399',
      thinking: '#fbbf24',
      happy: '#f472b6',
    };

    const color = moodColor[mood];

    return (
      <svg
        viewBox="0 0 60 80"
        width={COMPANION_SIZE}
        height={COMPANION_SIZE}
        style={{
          transform: `scaleX(${direction === 1 ? 1 : -1})`,
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))',
          transition: 'filter 0.2s',
        }}
      >
        {/* Shadow */}
        <ellipse cx="30" cy="77" rx="14" ry="3" fill="rgba(0,0,0,0.15)" />

        {/* Body group with bob */}
        <g transform={`translate(0, ${-bodyBob})`}>
          {/* Skirt / dress body */}
          <ellipse cx="30" cy="52" rx="13" ry="16" fill={color} opacity="0.9" />
          <ellipse cx="30" cy="50" rx="11" ry="12" fill={color} />

          {/* Torso */}
          <rect x="22" y="34" width="16" height="18" rx="6" fill={color} />

          {/* Arms */}
          <line
            x1="22"
            y1="38"
            x2={14 + armSwing}
            y2={46 - Math.abs(armSwing) * 0.3}
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <line
            x1="38"
            y1="38"
            x2={46 - armSwing}
            y2={46 - Math.abs(armSwing) * 0.3}
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Legs */}
          <line
            x1="26"
            y1="62"
            x2={26 - legSwing * 0.5}
            y2={74}
            stroke="#6d28d9"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <line
            x1="34"
            y1="62"
            x2={34 + legSwing * 0.5}
            y2={74}
            stroke="#6d28d9"
            strokeWidth="4.5"
            strokeLinecap="round"
          />

          {/* Shoes */}
          <ellipse cx={26 - legSwing * 0.5} cy="74" rx="4" ry="2.5" fill="#1e1b4b" />
          <ellipse cx={34 + legSwing * 0.5} cy="74" rx="4" ry="2.5" fill="#1e1b4b" />

          {/* Neck */}
          <rect x="27" y="27" width="6" height="8" rx="3" fill="#fde68a" />

          {/* Head */}
          <circle cx="30" cy="22" r="12" fill="#fde68a" />

          {/* Hair */}
          <ellipse cx="30" cy="13" rx="12" ry="8" fill="#7c3aed" />
          <ellipse cx="20" cy="20" rx="4" ry="7" fill="#7c3aed" />
          <ellipse cx="40" cy="20" rx="4" ry="7" fill="#7c3aed" />
          <ellipse cx="30" cy="11" rx="10" ry="6" fill="#8b5cf6" />

          {/* Eyes */}
          {mood === 'thinking' ? (
            <>
              <ellipse cx="25" cy="22" rx="3" ry="2.5" fill="white" />
              <circle cx="25" cy="22" r="1.5" fill="#1e1b4b" />
              <line x1="22" y1="19" x2="28" y2="20" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" />
              <ellipse cx="35" cy="22" rx="3" ry="2.5" fill="white" />
              <circle cx="35.5" cy="22" r="1.5" fill="#1e1b4b" />
            </>
          ) : mood === 'happy' ? (
            <>
              <path d="M22 22 Q25 19 28 22" stroke="#1e1b4b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d="M32 22 Q35 19 38 22" stroke="#1e1b4b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <ellipse cx="25" cy="22" rx="3" ry="3" fill="white" />
              <circle cx="25.5" cy="22" r="1.8" fill="#1e1b4b" />
              <circle cx="26" cy="21.2" r="0.6" fill="white" />
              <ellipse cx="35" cy="22" rx="3" ry="3" fill="white" />
              <circle cx="35.5" cy="22" r="1.8" fill="#1e1b4b" />
              <circle cx="36" cy="21.2" r="0.6" fill="white" />
            </>
          )}

          {/* Mouth */}
          {mood === 'talking' || mood === 'happy' ? (
            <ellipse cx="30" cy="27" rx="3" ry="2" fill="#f87171" />
          ) : (
            <path d="M27 27 Q30 29 33 27" stroke="#d97706" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          )}

          {/* Blush */}
          <ellipse cx="22" cy="25" rx="2.5" ry="1.5" fill="#fca5a5" opacity="0.5" />
          <ellipse cx="38" cy="25" rx="2.5" ry="1.5" fill="#fca5a5" opacity="0.5" />

          {/* Thinking bubble */}
          {mood === 'thinking' && (
            <>
              <circle cx="42" cy="14" r="1" fill="#a78bfa" opacity="0.8" />
              <circle cx="45" cy="10" r="1.5" fill="#a78bfa" opacity="0.8" />
              <circle cx="49" cy="6" r="2.5" fill="#a78bfa" opacity="0.8" />
              <text x="47" y="8" fontSize="3" fill="#4c1d95" textAnchor="middle">...</text>
            </>
          )}

          {/* Happy sparkles */}
          {mood === 'happy' && (
            <>
              <text x="48" y="10" fontSize="6">✨</text>
              <text x="5" y="15" fontSize="5">⭐</text>
            </>
          )}
        </g>
      </svg>
    );
  };

  const chatBoxLeft = Math.min(
    Math.max(posX - 120, 8),
    typeof window !== 'undefined' ? window.innerWidth - 336 : 20
  );

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-[60] w-[320px] rounded-2xl border bg-background shadow-2xl flex flex-col"
          style={{
            left: chatBoxLeft,
            bottom: BOTTOM_GAP + COMPANION_SIZE + 16,
            maxHeight: '420px',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl border-b bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg">
                {MOOD_EMOJI[mood]}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Study Companion</div>
                <div className="text-xs text-purple-200">
                  {sending ? 'Thinking...' : 'Ready to help!'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Close companion chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-2 px-3 py-3 text-sm min-h-0" style={{ maxHeight: '260px' }}>
            {messages.map((m, i) => (
              <div
                key={`msg-${i}`}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs">
                    🧝‍♀️
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'assistant'
                      ? 'rounded-tl-sm bg-muted text-foreground'
                      : 'rounded-tr-sm bg-violet-600 text-white'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs">
                  🧝‍♀️
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 border border-red-200">
                ⚠️ {error}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t px-3 py-2">
            <input
              ref={inputRef}
              className="h-9 flex-1 rounded-xl border bg-muted/50 px-3 text-sm outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-300 transition-all"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <Button
              size="sm"
              className="h-9 w-9 rounded-xl bg-violet-600 p-0 hover:bg-violet-700"
              onClick={send}
              disabled={sending || !input.trim()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Speech bubble */}
      {showBubble && !open && (
        <div
          className="fixed z-[59] pointer-events-none"
          style={{
            left: posX - 60,
            bottom: BOTTOM_GAP + COMPANION_SIZE + 8,
          }}
        >
          <div className="relative rounded-2xl bg-white border shadow-lg px-3 py-2 text-xs font-medium text-slate-700 whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-300">
            {bubbleText}
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '8px solid white',
                filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))',
              }}
            />
          </div>
        </div>
      )}

      {/* Companion character button */}
      <button
        type="button"
        className="fixed z-[60] cursor-pointer select-none outline-none"
        style={{
          left: posX,
          bottom: BOTTOM_GAP,
          width: COMPANION_SIZE,
          height: COMPANION_SIZE,
          transition: open || isHovered ? 'none' : 'left 0.03s linear',
          filter: isHovered ? 'brightness(1.1)' : undefined,
        }}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Toggle AI Study Companion"
        title="Chat with your Study Companion"
      >
        <WalkingCharacter />

        {/* Notification dot when chat is closed */}
        {!open && (
          <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 shadow">
            <MessageCircle className="h-3 w-3 text-white" />
          </div>
        )}
      </button>
    </>
  );
}