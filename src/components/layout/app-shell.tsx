'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Circle,
  Settings,
  HelpCircle,
  Plus,
  Award,
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
  const { user, signOut } = useAuth();
  const [walletAddress, setWalletAddress] = useState('');
  const [sftBalance, setSftBalance] = useState<string | null>(null);
  const [loadingSftBalance, setLoadingSftBalance] = useState(false);
  const [sftError, setSftError] = useState('');

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedWallet = localStorage.getItem('scholarfly_wallet_address') || '';
    setWalletAddress(storedWallet);
  }, [user?.id]);

  useEffect(() => {
    const fetchSftBalance = async () => {
      if (!walletAddress) {
        setSftBalance(null);
        setSftError('');
        return;
      }

      setLoadingSftBalance(true);
      setSftError('');

      try {
        const response = await fetch(
          `/api/token-balance?walletAddress=${encodeURIComponent(walletAddress)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load SFT balance.');
        }

        const balance = Number.parseFloat(String(data?.balanceFormatted || '0'));
        setSftBalance(Number.isFinite(balance) ? balance.toFixed(4) : String(data?.balanceFormatted || '0'));
      } catch (error) {
        setSftBalance(null);
        setSftError(error instanceof Error ? error.message : 'Failed to load SFT balance.');
      } finally {
        setLoadingSftBalance(false);
      }
    };

    fetchSftBalance();
  }, [walletAddress]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="hidden min-h-screen w-[250px] border-r bg-muted/30 p-4 lg:flex lg:flex-col">
          <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium">
            <Circle className="h-4 w-4" />
            <Link href="/dashboard" className="hover:text-primary transition-colors">
              ScholarFly
            </Link>
          </div>

          <Button asChild className="mt-6 justify-start rounded-lg bg-foreground text-background hover:bg-foreground/90">
            <Link href="/quick-create">
              <Plus className="mr-2 h-4 w-4" />
              Board your Flight
            </Link>
          </Button>

          <Link
            href="/badges"
            className="mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Award className="h-4 w-4" />
            <span>Badges</span>
          </Link>

          <div className="mt-3 rounded-lg border bg-background p-3">
            <div className="text-xs text-muted-foreground">SFT Balance</div>
            <div className="mt-1 text-lg font-semibold">
              {loadingSftBalance ? 'Loading...' : sftBalance !== null ? `${sftBalance} SFT` : '0.0000 SFT'}
            </div>
            {walletAddress ? (
              <div className="mt-1 text-[11px] text-muted-foreground">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </div>
            ) : (
              <div className="mt-1 text-[11px] text-muted-foreground">Connect wallet on Badges page</div>
            )}
            {sftError ? <div className="mt-1 text-[11px] text-red-600">{sftError}</div> : null}
          </div>

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
