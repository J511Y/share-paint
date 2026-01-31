'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Profile } from '@/types/database';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    const initAuth = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
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
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setLoading, logout]);

  return <>{children}</>;
}
