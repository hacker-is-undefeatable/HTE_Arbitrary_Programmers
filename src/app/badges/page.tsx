'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export default function BadgesPage() {
  const SEPOLIA_CHAIN_ID = '0xaa36a7';
  const { user } = useAuth();

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [badgeError, setBadgeError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Array<{ flight_tickets?: FlightTicket[] }>>([]);

  type FlightTicket = {
    id: string;
    title: string;
    completed?: boolean;
    completed_at?: string | null;
    nft_badge_tx_hash?: string | null;
    nft_badge_token_id?: string | null;
    nft_badge_token_uri?: string | null;
    created_at: string;
  };

  type NftMetadata = {
    name?: string;
    description?: string;
    image?: string;
  };

  function parseNftMetadataFromTokenUri(tokenUri?: string | null): NftMetadata | null {
    if (!tokenUri || typeof tokenUri !== 'string') return null;

    try {
      if (tokenUri.startsWith('data:application/json;utf8,')) {
        const encoded = tokenUri.replace('data:application/json;utf8,', '');
        return JSON.parse(decodeURIComponent(encoded));
      }

      if (tokenUri.startsWith('data:application/json;base64,')) {
        const encoded = tokenUri.replace('data:application/json;base64,', '');
        return JSON.parse(atob(encoded));
      }
    } catch {
      return null;
    }

    return null;
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedWallet = localStorage.getItem('scholarfly_wallet_address');
      if (storedWallet) {
        setWalletAddress(storedWallet);
      }
    }
  }, []);

  useEffect(() => {
    const loadBadges = async () => {
      if (!user?.id) {
        setSessions([]);
        return;
      }

      setLoadingBadges(true);
      setBadgeError(null);

      try {
        const response = await fetch(`/api/quick-create?userId=${user.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load badges.');
        }

        setSessions(Array.isArray(data) ? data : []);
      } catch (error) {
        setBadgeError(error instanceof Error ? error.message : 'Failed to load badges.');
        setSessions([]);
      } finally {
        setLoadingBadges(false);
      }
    };

    loadBadges();
  }, [user?.id]);

  const completedBadges = useMemo(() => {
    const tickets = sessions.flatMap((session) => session.flight_tickets || []);

    return tickets
      .filter((ticket) => Boolean(ticket.completed))
      .map((ticket) => {
        const metadata = parseNftMetadataFromTokenUri(ticket.nft_badge_token_uri);
        return {
          ...ticket,
          metadata,
        };
      })
      .sort((a, b) => {
        const aTime = new Date(a.completed_at || a.created_at).getTime();
        const bTime = new Date(b.completed_at || b.created_at).getTime();
        return bTime - aTime;
      });
  }, [sessions]);

  const ensureSepoliaNetwork = async () => {
    if (!window.ethereum) return;

    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChainId === SEPOLIA_CHAIN_ID) {
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError) {
      const err = switchError as { code?: number };

      if (err?.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID,
              chainName: 'Sepolia',
              nativeCurrency: {
                name: 'Sepolia ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://rpc.sepolia.org'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  };

  const handleConnectWallet = async () => {
    setWalletError(null);

    if (typeof window === 'undefined' || !window.ethereum) {
      setWalletError('MetaMask is not installed. Please install MetaMask to connect your wallet.');
      return;
    }

    setConnecting(true);
    try {
      await ensureSepoliaNetwork();

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const firstAccount = Array.isArray(accounts) ? String(accounts[0] || '') : '';

      if (!firstAccount) {
        setWalletError('No wallet account was returned by MetaMask.');
        setWalletAddress(null);
        return;
      }

      setWalletAddress(firstAccount);
      localStorage.setItem('scholarfly_wallet_address', firstAccount);
    } catch {
      setWalletError('Wallet connection failed. Please approve switching to Sepolia and try again.');
      setWalletAddress(null);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <AppShell title="Badges" subtitle="Track your achievements and connect your wallet">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Connect MetaMask Wallet</CardTitle>
            <CardDescription>
              Connect your wallet to prepare for future badge ownership and verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleConnectWallet} disabled={connecting}>
              {connecting ? 'Connecting...' : walletAddress ? 'Reconnect MetaMask' : 'Connect MetaMask Wallet'}
            </Button>

            {walletAddress ? (
              <p className="text-sm text-green-700">
                Connected wallet: <span className="font-medium">{walletAddress}</span>
              </p>
            ) : null}

            {walletAddress ? (
              <p className="text-sm text-muted-foreground">Network: Sepolia Testnet</p>
            ) : null}

            {walletError ? <p className="text-sm text-red-600">{walletError}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Badge Progress</CardTitle>
            <CardDescription>Your completed lecture ticket NFT badges on Sepolia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingBadges ? <p className="text-sm text-muted-foreground">Loading badges...</p> : null}
            {badgeError ? <p className="text-sm text-red-600">{badgeError}</p> : null}

            {!loadingBadges && !badgeError && completedBadges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No badges unlocked yet.</p>
            ) : null}

            {completedBadges.map((badge) => (
              <div key={badge.id} className="rounded-md border bg-muted/20 p-3">
                <div className="flex items-start gap-3">
                  {badge.metadata?.image ? (
                    <img
                      src={badge.metadata.image}
                      alt={badge.metadata?.name || 'NFT badge preview'}
                      className="h-20 w-20 rounded-md border object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                      No image
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-foreground">
                      {badge.metadata?.name || badge.title || 'ScholarFly Completion Badge'}
                    </p>

                    {badge.nft_badge_token_id ? (
                      <p className="text-muted-foreground">Token ID: {badge.nft_badge_token_id}</p>
                    ) : null}

                    <p className="text-muted-foreground">
                      Completed: {new Date(badge.completed_at || badge.created_at).toLocaleString()}
                    </p>

                    {badge.nft_badge_tx_hash ? (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${badge.nft_badge_tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground underline"
                      >
                        View Transaction
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
