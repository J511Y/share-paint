import { getSupabasePublicEnv } from '@/lib/supabase/env';

export type SocialAuthProvider = 'google' | 'kakao' | 'naver';

export type SocialProviderStatus = {
  available: boolean;
  message?: string;
};

export const SOCIAL_AUTH_PROVIDERS: SocialAuthProvider[] = [
  'google',
  'kakao',
  'naver',
];

export const SOCIAL_AUTH_PROVIDER_LABELS: Record<SocialAuthProvider, string> = {
  google: 'Google',
  kakao: 'Kakao',
  naver: 'Naver',
};

const SOCIAL_AUTH_PROVIDER_ENV_KEYS: Record<SocialAuthProvider, string> = {
  google: 'NEXT_PUBLIC_AUTH_GOOGLE_ENABLED',
  kakao: 'NEXT_PUBLIC_AUTH_KAKAO_ENABLED',
  naver: 'NEXT_PUBLIC_AUTH_NAVER_ENABLED',
};

function parseBooleanEnvValue(value: string | undefined): boolean | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  return null;
}

export function getSocialProviderStatus(provider: SocialAuthProvider): SocialProviderStatus {
  if (!getSupabasePublicEnv()) {
    return {
      available: false,
      message: '인증 서비스 설정이 누락되어 소셜 로그인을 사용할 수 없습니다.',
    };
  }

  const envKey = SOCIAL_AUTH_PROVIDER_ENV_KEYS[provider];
  const rawValue = process.env[envKey];
  const parsedValue = parseBooleanEnvValue(rawValue);

  if (parsedValue === true) {
    return { available: true };
  }

  if (parsedValue === false) {
    return {
      available: false,
      message: `${SOCIAL_AUTH_PROVIDER_LABELS[provider]} 로그인은 현재 일시적으로 사용할 수 없습니다.`,
    };
  }

  return {
    available: false,
    message: `${SOCIAL_AUTH_PROVIDER_LABELS[provider]} 로그인 설정이 아직 완료되지 않았습니다.`,
  };
}

export function getSocialProviderStatuses(): Record<SocialAuthProvider, SocialProviderStatus> {
  return SOCIAL_AUTH_PROVIDERS.reduce(
    (acc, provider) => {
      acc[provider] = getSocialProviderStatus(provider);
      return acc;
    },
    {} as Record<SocialAuthProvider, SocialProviderStatus>
  );
}
