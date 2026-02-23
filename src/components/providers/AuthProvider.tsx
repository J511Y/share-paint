'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import { useAuthStore } from '@/stores/authStore';
import { ApiProfileSchema } from '@/lib/validation/schemas';
import type { Profile } from '@/types/database';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, logout } = useAuthStore();

  useEffect(() => {
    if (!getSupabasePublicEnv()) {
      console.warn(
        '[AuthProvider] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Skipping auth bootstrap.'
      );
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
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, logout]);

  return <>{children}</>;
}
