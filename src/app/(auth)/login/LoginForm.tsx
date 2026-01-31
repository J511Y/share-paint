'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';

const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/feed';
  const { signIn, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginValues) => {
    setError(null);
    try {
      await signIn(data.email, data.password);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else {
          setError(err.message);
        }
      } else {
        setError('로그인 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">로그인</CardTitle>
        <CardDescription>
          계정에 로그인하여 그림을 공유해보세요
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Input
            label="이메일"
            type="email"
            placeholder="example@email.com"
            {...register('email')}
            error={errors.email?.message}
            autoComplete="email"
            leftIcon={<Mail className="h-5 w-5" />}
          />

          <Input
            label="비밀번호"
            type="password"
            placeholder="비밀번호를 입력하세요"
            {...register('password')}
            error={errors.password?.message}
            autoComplete="current-password"
            leftIcon={<Lock className="h-5 w-5" />}
          />
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            로그인
          </Button>

          <p className="text-center text-sm text-gray-600">
            계정이 없으신가요?{' '}
            <Link
              href={`/register${redirectTo !== '/feed' ? `?redirect=${redirectTo}` : ''}`}
              className="font-medium text-purple-600 hover:text-purple-700"
            >
              회원가입
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
