'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@/utils/supabase';
import { Profile } from '@/types';

/**
 * Hook to manage Supabase authentication
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    // Get initial user
    const getUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        setError(error.message);
      } else {
        setUser(user);
      }
      setLoading(false);
    };

    getUser();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      return null;
    }
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      return null;
    }
    setUser(data.user);
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setError(error.message);
    } else {
      setUser(null);
    }
  };

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
  };
};

/**
 * Hook to manage user profile
 */
export const useProfile = (userId: string | null) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        setError(error.message);
      } else {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return;

    const query = (supabase.from('profiles') as any);
    const { data, error } = await query
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      setError(error.message);
      return null;
    }

    setProfile(data);
    return data;
  };

  const createProfile = async (profileData: Omit<Profile, 'created_at' | 'updated_at'>) => {
    const query = (supabase.from('profiles') as any);
    const { data, error } = await query
      .insert([profileData])
      .select()
      .single();

    if (error) {
      setError(error.message);
      return null;
    }

    setProfile(data);
    return data;
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    createProfile,
  };
};

/**
 * Hook to manage mastery scores
 */
export const useMasteryScores = (userId: string | null) => {
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchScores = async () => {
      const { data } = await supabase
        .from('mastery_scores')
        .select('*')
        .eq('user_id', userId);

      setScores(data || []);
      setLoading(false);
    };

    fetchScores();
  }, [userId]);

  const updateMasteryScore = async (
    subject: string,
    topic: string,
    newScore: number
  ) => {
    if (!userId) return;

    const query = (supabase.from('mastery_scores') as any);
    const { data, error } = await query
      .upsert(
        {
          user_id: userId,
          subject,
          topic,
          mastery_score: newScore,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'user_id,subject,topic' }
      )
      .select()
      .single();

    if (!error && data) {
      setScores((prev) =>
        prev.map((score) =>
          score.user_id === userId && score.subject === subject && score.topic === topic
            ? { ...score, mastery_score: newScore }
            : score
        )
      );
    }

    return data;
  };

  return {
    scores,
    loading,
    updateMasteryScore,
  };
}
