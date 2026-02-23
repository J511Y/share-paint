'use client';

import Link from 'next/link';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui';

export function LoginForm() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">게스트 모드가 기본입니다</CardTitle>
        <CardDescription>
          로그인 없이도 그리기, 피드, 대결, 좋아요, 댓글, 팔로우를 바로 사용할 수 있어요.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <Link href="/feed">
          <Button size="lg" className="w-full">
            게스트로 계속하기
          </Button>
        </Link>
        <Link href="/draw">
          <Button size="lg" variant="outline" className="w-full">
            바로 그림 그리기
          </Button>
        </Link>

        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          계정 로그인은 현재 선택 기능입니다. 핵심 기능은 게스트 모드에서 모두 사용할 수 있습니다.
        </div>
      </CardContent>

      <CardFooter className="justify-center text-sm text-gray-600">
        <Link href="/" className="text-purple-600 hover:text-purple-700">
          홈으로 이동
        </Link>
      </CardFooter>
    </Card>
  );
}
