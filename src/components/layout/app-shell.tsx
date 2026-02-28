'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Circle,
  Settings,
  HelpCircle,
  Plus,
  UserCircle,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
  outsideTopSlot?: ReactNode;
}

export function AppShell({ title, subtitle, children, rightSlot, outsideTopSlot }: AppShellProps) {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

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

          <div className="mt-auto space-y-1">
            <Link
              href="/profile"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <UserCircle className="h-4 w-4" />
              <span>Profile</span>
            </Link>
            <Link
              href="/settings"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
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
          </div>
        </aside>

        <main className="w-full p-4 lg:p-5">
          {outsideTopSlot ? <div className="mb-3">{outsideTopSlot}</div> : null}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
              <div>
                <h1 className="text-base font-semibold">{title}</h1>
                {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
              </div>
              {rightSlot}
            </div>
            <div className="p-4 sm:p-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
