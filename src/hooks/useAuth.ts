'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import { buildOAuthRedirectUrl, sanitizeRedirectTarget } from '@/lib/auth/redirect';
import {
  getSocialProviderStatuses,
  SOCIAL_AUTH_PROVIDER_LABELS,
  type SocialAuthProvider,
} from '@/lib/auth/providers';
import { useAuthStore } from '@/stores/authStore';
import { ApiProfileSchema } from '@/lib/validation/schemas';
import type { Profile } from '@/types/database';

const AUTH_UNAVAILABLE_ERROR_MESSAGE =
  '인증 서비스 설정이 누락되어 로그인을 사용할 수 없습니다.';

const OAUTH_REDIRECT_UNAVAILABLE_ERROR_MESSAGE =
  '앱 URL 설정을 확인해주세요. 소셜 로그인 리다이렉트를 생성할 수 없습니다.';

export function useAuth() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, setUser, setLoading, logout } =
    useAuthStore();

  const providerStatuses = getSocialProviderStatuses();

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

  const signInWithProvider = async (
    provider: SocialAuthProvider,
    redirectTo: string = '/feed'
  ) => {
    if (!getSupabasePublicEnv()) {
      throw new Error(AUTH_UNAVAILABLE_ERROR_MESSAGE);
    }

    const providerStatus = providerStatuses[provider];
    if (!providerStatus.available) {
      throw new Error(
        providerStatus.message ||
          `${SOCIAL_AUTH_PROVIDER_LABELS[provider]} 로그인은 현재 일시적으로 사용할 수 없습니다.`
      );
    }

    const oauthRedirectUrl = buildOAuthRedirectUrl(sanitizeRedirectTarget(redirectTo));

    if (!oauthRedirectUrl) {
      throw new Error(OAUTH_REDIRECT_UNAVAILABLE_ERROR_MESSAGE);
    }

    const supabase = createClient();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as unknown as Parameters<
          typeof supabase.auth.signInWithOAuth
        >[0]['provider'],
        options: {
          redirectTo: oauthRedirectUrl,
        },
      });

      if (error) {
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes('provider is not enabled') ||
          errorMessage.includes('unsupported provider')
        ) {
          throw new Error(
            `${SOCIAL_AUTH_PROVIDER_LABELS[provider]} 로그인은 현재 일시적으로 사용할 수 없습니다. 관리자에게 문의해주세요.`
          );
        }

        throw error;
      }
    } catch (error) {
      console.error('OAuth sign-in exception:', error);
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
    providerStatuses,
    signInWithProvider,
    signOut,
  };
}
