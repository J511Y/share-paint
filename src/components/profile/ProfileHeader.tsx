'use client';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Settings, UserPlus, UserMinus } from 'lucide-react';
import type { Profile } from '@/types/database';

interface ProfileHeaderProps {
  profile: Profile & {
    followersCount: number;
    followingCount: number;
    isFollowing: boolean;
  };
  isOwnProfile: boolean;
}

export function ProfileHeader({ profile, isOwnProfile }: ProfileHeaderProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* 아바타 */}
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-200 overflow-hidden shrink-0 border-4 border-white shadow-md">
          {profile.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.username}
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl font-bold bg-gray-100">
              {profile.username[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.display_name || profile.username}
            </h1>
            <span className="text-gray-500 text-sm">@{profile.username}</span>
          </div>

          <p className="text-gray-600 max-w-lg mx-auto md:mx-0">
            {profile.bio || '자기소개가 없습니다.'}
          </p>

          <div className="flex items-center justify-center md:justify-start gap-6 pt-2">
            <div className="text-center">
              <div className="font-bold text-gray-900">{profile.followersCount}</div>
              <div className="text-xs text-gray-500">팔로워</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-gray-900">{profile.followingCount}</div>
              <div className="text-xs text-gray-500">팔로잉</div>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          {isOwnProfile ? (
            <Button variant="outline" size="sm" leftIcon={<Settings className="w-4 h-4" />}>
              프로필 편집
            </Button>
          ) : (
            <Button 
              variant={isFollowing ? "outline" : "primary"} 
              size="sm"
              onClick={toggleFollow}
              disabled={isLoading}
              leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />)}
            >
              {isFollowing ? '팔로잉' : '팔로우'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
