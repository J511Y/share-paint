import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
      <main className="flex flex-col items-center gap-8 px-4 text-center text-white">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          PaintShare
        </h1>
        <p className="max-w-md text-xl opacity-90">
          주어진 시간 안에 그림을 그리고
          <br />
          친구들과 공유해보세요!
        </p>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/draw"
            className="rounded-full bg-white px-8 py-3 font-semibold text-purple-600 shadow-lg transition-transform hover:scale-105"
          >
            그림 그리기
          </Link>
          <Link
            href="/feed"
            className="rounded-full border-2 border-white px-8 py-3 font-semibold text-white transition-transform hover:scale-105 hover:bg-white/10"
          >
            피드 구경하기
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">30s</span>
            <span className="text-sm opacity-80">스피드 드로잉</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">1m</span>
            <span className="text-sm opacity-80">퀵 스케치</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">5m</span>
            <span className="text-sm opacity-80">일반 모드</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">10m</span>
            <span className="text-sm opacity-80">작품 모드</span>
          </div>
        </div>

        <div className="mt-8">
          <Link
            href="/battle"
            className="flex items-center gap-2 rounded-full bg-black/20 px-6 py-3 font-medium backdrop-blur-sm transition-colors hover:bg-black/30"
          >
            <span className="text-xl">VS</span>
            <span>실시간 대결하기</span>
          </Link>
        </div>
      </main>

      <footer className="absolute bottom-4 text-sm text-white/60">
        PaintShare - 그림 스피드런 SNS
      </footer>
    </div>
  );
}
