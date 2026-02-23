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

export function RegisterForm() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">회원가입 없이 시작하세요</CardTitle>
        <CardDescription>
          PaintShare는 게스트 우선 서비스입니다. 지금 바로 참여하고, 원할 때만 계정을 연결하세요.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <Link href="/feed">
          <Button size="lg" className="w-full">
            게스트로 시작하기
          </Button>
        </Link>
        <Link href="/battle">
          <Button size="lg" variant="outline" className="w-full">
            실시간 대결 보러가기
          </Button>
        </Link>

        <div className="rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
          계정은 선택 사항입니다. 게스트 모드에서도 핵심 기능을 동일하게 사용할 수 있습니다.
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
