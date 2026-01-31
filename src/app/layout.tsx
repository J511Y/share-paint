import type { Metadata, Viewport } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import { AuthProvider } from '@/components/providers';
import './globals.css';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-kr',
});

export const metadata: Metadata = {
  title: {
    default: 'PaintShare - 그림 스피드런 SNS',
    template: '%s | PaintShare',
  },
  description:
    '주어진 시간 안에 그림을 그리고 공유하는 그림 스피드런 SNS. 랜덤 주제로 그림을 그리고, 친구들과 대결해보세요!',
  keywords: ['그림', '스피드런', 'SNS', '드로잉', '대결', '아트', '캔버스'],
  authors: [{ name: 'PaintShare Team' }],
  openGraph: {
    title: 'PaintShare - 그림 스피드런 SNS',
    description: '주어진 시간 안에 그림을 그리고 공유하는 그림 스피드런 SNS',
    type: 'website',
    locale: 'ko_KR',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKR.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
