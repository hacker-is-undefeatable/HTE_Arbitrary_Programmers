'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Circle, Plus, LogIn, UserPlus, Home, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PublicShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
}

const MENU_ITEMS = [
  { label: 'Learning', href: '/learning' },
  { label: 'Lecture Notes', href: '/lecture-notes' },
  { label: 'Quizzes', href: '/quizzes' },
  { label: 'Flash cards', href: '/flash-cards' },
];

export function PublicShell({ title, subtitle, children, rightSlot }: PublicShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="hidden min-h-screen w-[250px] border-r bg-muted/30 p-4 lg:flex lg:flex-col">
          <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium">
            <Circle className="h-4 w-4" />
            <Link href="/" className="hover:text-primary transition-colors">
              Acme Inc.
            </Link>
          </div>

          <Button asChild className="mt-6 justify-start rounded-lg bg-foreground text-background hover:bg-foreground/90">
            <Link href="/signup">
              <Plus className="mr-2 h-4 w-4" />
              Get Started
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
            <Link
              href="/"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
            <Link
              href="/login"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogIn className="h-4 w-4" />
              <span>Login</span>
            </Link>
            <Link
              href="/signup"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <UserPlus className="h-4 w-4" />
              <span>Register</span>
            </Link>

            <div className="mt-3 rounded-lg border bg-background p-3">
              <div className="text-sm font-medium">DualPath AI</div>
              <div className="text-xs text-muted-foreground">AI-powered learning platform</div>
            </div>
          </div>
        </aside>

        <main className="w-full p-4 lg:p-5">
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
              <div>
                <h1 className="text-base font-semibold">{title}</h1>
                {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
              </div>
              {rightSlot || (
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span>DualPath</span>
                </div>
              )}
            </div>
            <div className="p-4 sm:p-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
