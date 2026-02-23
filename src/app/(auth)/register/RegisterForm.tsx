'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, User, Lock, UserCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { buildAuthRedirectLink } from '@/lib/auth/redirect';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';

const registerSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  username: z
    .string()
    .min(3, '사용자명은 3자 이상이어야 합니다.')
    .regex(/^[a-zA-Z0-9_]+$/, '사용자명은 영문, 숫자, 밑줄만 사용 가능합니다.'),
  displayName: z.string().optional(),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다.'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다.',
  path: ['confirmPassword'],
});

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/feed';
  const { signUp, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFieldError,
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      displayName: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterValues) => {
    setError(null);
    try {
      await signUp(data.email, data.password, data.username, data.displayName || undefined);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('already registered')) {
          setError('이미 등록된 이메일입니다.');
        } else if (err.message.includes('duplicate key') && err.message.includes('username')) {
          setFieldError('username', { message: '이미 사용 중인 사용자명입니다.' });
        } else {
          setError(err.message);
        }
      } else {
        setError('회원가입 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">회원가입</CardTitle>
        <CardDescription>
          PaintShare에 가입하고 그림을 공유해보세요
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
            label="사용자명"
            type="text"
            placeholder="username"
            {...register('username')}
            error={errors.username?.message}
            helperText="영문, 숫자, 밑줄만 사용 가능 (3자 이상)"
            autoComplete="username"
            leftIcon={<User className="h-5 w-5" />}
          />

          <Input
            label="표시 이름 (선택)"
            type="text"
            placeholder="홍길동"
            {...register('displayName')}
            error={errors.displayName?.message}
            helperText="다른 사용자에게 보여지는 이름입니다"
            autoComplete="name"
            leftIcon={<UserCircle className="h-5 w-5" />}
          />

          <Input
            label="비밀번호"
            type="password"
            placeholder="6자 이상 입력하세요"
            {...register('password')}
            error={errors.password?.message}
            autoComplete="new-password"
            leftIcon={<Lock className="h-5 w-5" />}
          />

          <Input
            label="비밀번호 확인"
            type="password"
            placeholder="비밀번호를 다시 입력하세요"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
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
            회원가입
          </Button>

          <p className="text-center text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link
              href={buildAuthRedirectLink('/login', redirectTo)}
              className="font-medium text-purple-600 hover:text-purple-700"
            >
              로그인
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
