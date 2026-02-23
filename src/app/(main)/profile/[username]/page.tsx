'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { ProfileHeader, PaintingGrid } from '@/components/profile';
import { withGuestHeaders } from '@/lib/guest/client';
import { getStringParam } from '@/lib/validation/params';
import { ProfileWithCountsSchema } from '@/lib/validation/schemas';
import { parseJsonResponse } from '@/lib/validation/http';
import type { ProfileWithCounts } from '@/lib/validation/schemas';

export default function ProfilePage() {
  const params = useParams();
  const username = getStringParam(params, 'username');

  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileWithCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/users/by-username/${username}`, withGuestHeaders());
        if (!res.ok) {
          if (res.status === 404) throw new Error('사용자를 찾을 수 없습니다.');
          throw new Error('프로필을 조회할 수 없습니다.');
        }

        const data = await parseJsonResponse(res, ProfileWithCountsSchema);
        setProfile(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('알 수 없는 오류가 발생했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  if (!username) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">잘못된 사용자명</h2>
        <p className="text-gray-600">사용자명이 유효하지 않습니다.</p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">오류 발생</h2>
        <p className="text-gray-600">{error || '사용자 정보를 가져오지 못했습니다.'}</p>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />

      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 px-1 border-l-4 border-primary-500">
          작품 목록
        </h2>
        <PaintingGrid userId={profile.id} />
      </div>
    </div>
  );
}
