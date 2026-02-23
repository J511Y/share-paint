'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  SOCIAL_AUTH_PROVIDERS,
  SOCIAL_AUTH_PROVIDER_LABELS,
  type SocialAuthProvider,
} from '@/lib/auth/providers';
import { buildAuthRedirectLink, resolveRedirectTarget } from '@/lib/auth/redirect';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';

const providerButtonClassName: Record<SocialAuthProvider, string> = {
  google:
    'w-full border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400',
  kakao:
    'w-full border border-yellow-300 bg-[#FEE500] text-[#191919] hover:bg-[#F7DC00] disabled:bg-yellow-100 disabled:text-gray-500',
  naver:
    'w-full border border-green-600 bg-[#03C75A] text-white hover:bg-[#02b352] disabled:bg-green-200 disabled:text-white/80',
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = resolveRedirectTarget(searchParams);
  const { signInWithProvider, providerStatuses, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<SocialAuthProvider | null>(null);

  const onSocialLogin = async (provider: SocialAuthProvider) => {
    setError(null);
    setPendingProvider(provider);

    try {
      await signInWithProvider(provider, redirectTo);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('소셜 로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setPendingProvider(null);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">로그인</CardTitle>
        <CardDescription>Google, Kakao, Naver 계정으로 로그인할 수 있습니다.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
          이메일/비밀번호 로그인은 지원하지 않습니다. 소셜 계정으로만 로그인할 수 있습니다.
        </div>

        <div className="space-y-3">
          {SOCIAL_AUTH_PROVIDERS.map((provider) => {
            const providerStatus = providerStatuses[provider];

            return (
              <div key={provider} className="space-y-1">
                <Button
                  type="button"
                  className={providerButtonClassName[provider]}
                  size="lg"
                  disabled={!providerStatus.available}
                  isLoading={isLoading && pendingProvider === provider}
                  onClick={() => onSocialLogin(provider)}
                >
                  {SOCIAL_AUTH_PROVIDER_LABELS[provider]}로 계속하기
                </Button>

                {!providerStatus.available && providerStatus.message && (
                  <p className="text-xs text-amber-700">{providerStatus.message}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <p className="text-center text-sm text-gray-600">
          계정이 없으신가요?{' '}
          <Link
            href={buildAuthRedirectLink('/register', redirectTo)}
            className="font-medium text-purple-600 hover:text-purple-700"
          >
            회원가입
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
