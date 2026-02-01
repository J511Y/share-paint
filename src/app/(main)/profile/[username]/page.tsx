'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProfileHeader, PaintingGrid } from '@/components/profile';
import { Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/users/${username}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('사용자를 찾을 수 없습니다.');
          throw new Error('프로필을 불러오는데 실패했습니다.');
        }
        const data = await res.json();
        setProfile(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

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
        <p className="text-gray-600">{error || '프로필을 찾을 수 없습니다.'}</p>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />
      
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 px-1 border-l-4 border-primary-500">
          갤러리
        </h2>
        <PaintingGrid userId={profile.id} />
      </div>
    </div>
  );
}
