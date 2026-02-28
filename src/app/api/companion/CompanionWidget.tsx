'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Send, X } from 'lucide-react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

declare global {
  interface Window {
    PIXI?: any;
    Live2D?: any;
  }
}

const LIVE2D_MODEL_URL =
  '/models/shizuku/shizuku.model.json';

function loadScript(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if ((existing as any).dataset?.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

export default function CompanionWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your Live2D study companion 🌟 Ask me about your lectures, quizzes, or revision plans!",
    },
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('Need help? Click me!');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const initLive2D = async () => {
      if (!canvasRef.current) return;

      try {
        await loadScript('https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js', 'pixi-js-cdn');
        await loadScript(
          'https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js',
          'live2d-core-cdn'
        );
        await loadScript(
          'https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/cubism2.min.js',
          'pixi-live2d-cdn'
        );

        if (!mounted || !canvasRef.current || !window.PIXI?.live2d?.Live2DModel) return;

        const PIXI = window.PIXI;
        const app = new PIXI.Application({
          view: canvasRef.current,
          width: 140,
          height: 160,
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
        });

        appRef.current = app;

        const model = await PIXI.live2d.Live2DModel.from(LIVE2D_MODEL_URL);
        if (!mounted) return;

        model.anchor.set(0.5, 0.92);
        model.x = app.renderer.width / 2;
        model.y = app.renderer.height;

        const scaleX = app.renderer.width / model.width;
        const scaleY = app.renderer.height / model.height;
        const scale = Math.min(scaleX, scaleY) * 1.35;
        model.scale.set(scale);

        app.stage.addChild(model);

        model.on('hit', (areas: string[]) => {
          if (areas.includes('body') && model.motion) {
            model.motion('tap_body');
          }
        });
      } catch (e) {
        console.error('[CompanionWidget] Live2D init failed:', e);
      }
    };

    initLive2D();

    return () => {
      mounted = false;
      if (appRef.current) {
        appRef.current.destroy(true, true);
        appRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (open) {
      setHint('');
      return;
    }

    const hints = [
      'Need help? Click me!',
      'Ask me study questions 📚',
      'Let’s revise together ✨',
    ];

    let index = 0;
    setHint(hints[index]);

    const timer = setInterval(() => {
      index = (index + 1) % hints.length;
      setHint(hints[index]);
    }, 6000);

    return () => clearInterval(timer);
  }, [open]);

  const send = async () => {
    const question = input.trim();
    if (!question || sending) return;

    setError('');

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: question }];
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-0 z-50">
      {open ? (
        <Card className="mb-3 flex h-[470px] w-[360px] flex-col overflow-hidden border shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Live2D Companion</p>
              <p className="text-xs text-muted-foreground">Ask anything about your learning</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-3">
            {messages.map((message, idx) => (
              <div
                key={`${message.role}-${idx}`}
                className={`max-w-[88%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'border bg-background text-foreground'
                }`}
              >
                {message.content}
              </div>
            ))}

            {sending ? (
              <div className="inline-block rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground">
                Thinking...
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            ) : null}

            <div ref={chatEndRef} />
          </div>

          <div className="border-t bg-background p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask your companion..."
                className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button onClick={send} disabled={sending || !input.trim()} size="icon" className="h-10 w-10">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="relative flex justify-end">
        {!open && hint ? (
          <div className="absolute bottom-[150px] right-[10px] max-w-[190px] rounded-2xl border bg-background px-3 py-2 text-xs shadow-sm">
            {hint}
            <span
              aria-hidden="true"
              className="absolute -bottom-1.5 right-7 h-3 w-3 rotate-45 border-b border-r bg-background"
            />
          </div>
        ) : null}

        <button
          type="button"
          aria-label="Toggle Live2D companion"
          className="h-[140px] w-[140px] appearance-none border-0 bg-transparent p-0 transition hover:scale-[1.02]"
          onClick={() => setOpen((prev) => !prev)}
        >
          <canvas ref={canvasRef} className="h-full w-full" />
        </button>
      </div>
    </div>
  );
}
