'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import { useAuthStore } from '@/stores/authStore';
import { ApiProfileSchema } from '@/lib/validation/schemas';
import type { Database, Profile } from '@/types/database';

const AUTH_UNAVAILABLE_ERROR_MESSAGE =
  '인증 서비스 설정이 누락되어 로그인을 사용할 수 없습니다.';

export function useAuth() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, setUser, setLoading, logout } =
    useAuthStore();

  useEffect(() => {
    if (!getSupabasePublicEnv()) {
      setUser(null);
      return;
    }

    const supabase = createClient();

    const getProfile = async (userId: string): Promise<Profile | null> => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !profile) return null;

      const parsedProfile = ApiProfileSchema.safeParse(profile);
      return parsedProfile.success ? parsedProfile.data : null;
    };

    const initAuth = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          const profile = await getProfile(authUser.id);
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: string, session: { user?: { id: string } } | null) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await getProfile(session.user.id);
          setUser(profile);
        } else if (event === 'SIGNED_OUT') {
          logout();
          router.push('/login');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, logout, router]);

  const signIn = async (email: string, password: string) => {
    if (!getSupabasePublicEnv()) {
      throw new Error(AUTH_UNAVAILABLE_ERROR_MESSAGE);
    }

    const supabase = createClient();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase signIn error:', error);
        throw error;
      }

      console.log('Login successful:', data);
      router.push('/feed');
    } catch (error) {
      console.error('Login exception:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    displayName?: string
  ) => {
    if (!getSupabasePublicEnv()) {
      throw new Error(AUTH_UNAVAILABLE_ERROR_MESSAGE);
    }

    const supabase = createClient();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const profileData: Database['public']['Tables']['profiles']['Insert'] = {
          id: data.user.id,
          username,
          display_name: displayName || username,
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert(profileData);

        if (profileError) throw profileError;
      }

      router.push('/feed');
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!getSupabasePublicEnv()) {
      logout();
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
  };
}
