'use client';

import { useAuth, useProfile } from '@/hooks/useAuth';
import { StudyCompanionPanel } from './StudyCompanionPanel';

/**
 * Mounts the Study Companion on every page for logged-in users
 * who have a profile. This keeps it global without changing
 * individual page layouts.
 */
export function GlobalStudyCompanion() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id ?? null);

  if (authLoading || profileLoading) return null;
  if (!user || !profile) return null;

  return <StudyCompanionPanel profile={profile} />;
}

