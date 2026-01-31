import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* 왼쪽: 브랜딩 영역 */}
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-12 lg:flex">
        <Link href="/" className="text-2xl font-bold text-white">
          PaintShare
        </Link>

        <div className="space-y-6 text-white">
          <h1 className="text-4xl font-bold leading-tight">
            제한된 시간,
            <br />
            무한한 창의력
          </h1>
          <p className="text-lg opacity-90">
            주어진 시간 안에 그림을 그리고 친구들과 공유하세요.
            <br />
            실시간 대결로 더욱 짜릿한 경험을 즐겨보세요!
          </p>
        </div>

        <div className="flex items-center gap-8 text-white/80">
          <div className="text-center">
            <div className="text-2xl font-bold">30초</div>
            <div className="text-sm">스피드 드로잉</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">실시간</div>
            <div className="text-sm">대결 모드</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">SNS</div>
            <div className="text-sm">공유 & 소통</div>
          </div>
        </div>
      </div>

      {/* 오른쪽: 인증 폼 영역 */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-4 py-12">
        <div className="mb-8 lg:hidden">
          <Link
            href="/"
            className="text-2xl font-bold text-purple-600"
          >
            PaintShare
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
