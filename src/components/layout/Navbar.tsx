'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/feed', label: '피드' },
  { href: '/draw', label: '그리기' },
  { href: '/battle', label: '대결' },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* 로고 */}
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-purple-600">
              PaintShare
            </Link>

            {/* 데스크톱 네비게이션 */}
            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    pathname === link.href
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* 오른쪽 영역 */}
          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-gray-100"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-medium text-purple-600">
                    {user.display_name?.[0] || user.username[0].toUpperCase()}
                  </div>
                  <span className="hidden text-sm font-medium text-gray-700 sm:block">
                    {user.display_name || user.username}
                  </span>
                  <ChevronDown className="hidden h-4 w-4 text-gray-400 sm:block" />
                </button>

                {isProfileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0"
                      onClick={() => setIsProfileMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      <Link
                        href={`/profile/${user.username}`}
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <User className="h-4 w-4" />
                        내 프로필
                      </Link>
                      <hr className="my-1 border-gray-200" />
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          signOut();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        로그아웃
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    로그인
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">회원가입</Button>
                </Link>
              </div>
            )}

            {/* 모바일 메뉴 버튼 */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {isMenuOpen && (
          <div className="border-t border-gray-200 py-4 md:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    pathname === link.href
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {!isAuthenticated && (
              <div className="mt-4 flex flex-col gap-2 border-t border-gray-200 pt-4">
                <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    로그인
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full">회원가입</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
