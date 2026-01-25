'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Profile, ProfileInsert } from '@/types/database';

export function useAuth() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, setUser, setLoading, logout } =
    useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    // 초기 세션 확인
    const initAuth = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          // 프로필 정보 가져오기
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          setUser(profile as Profile | null);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      }
    };

    initAuth();

    // 인증 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setUser(profile as Profile | null);
      } else if (event === 'SIGNED_OUT') {
        logout();
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setLoading, logout, router]);

  const signIn = async (email: string, password: string) => {
    const supabase = createClient();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      router.push('/feed');
    } catch (error) {
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
    const supabase = createClient();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // 프로필 생성
      if (data.user) {
        const profileData: ProfileInsert = {
          id: data.user.id,
          username,
          display_name: displayName || username,
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert(profileData as never);

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
