import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockPush = vi.fn();
const mockSetUser = vi.fn();
const mockSetLoading = vi.fn();
const mockLogout = vi.fn();

const mockSignInWithOAuth = vi.fn();
const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignOut = vi.fn();
const createClientMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    setUser: mockSetUser,
    setLoading: mockSetLoading,
    logout: mockLogout,
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => createClientMock(),
}));

describe('useAuth', () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalGoogleEnabled = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED;
  const originalKakaoEnabled = process.env.NEXT_PUBLIC_AUTH_KAKAO_ENABLED;
  const originalNaverEnabled = process.env.NEXT_PUBLIC_AUTH_NAVER_ENABLED;

  beforeEach(() => {
    vi.clearAllMocks();

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED;
    delete process.env.NEXT_PUBLIC_AUTH_KAKAO_ENABLED;
    delete process.env.NEXT_PUBLIC_AUTH_NAVER_ENABLED;

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    createClientMock.mockReturnValue({
      auth: {
        getUser: mockGetUser,
        onAuthStateChange: mockOnAuthStateChange,
        signInWithOAuth: mockSignInWithOAuth,
        signOut: mockSignOut,
      },
      from: vi.fn(),
    });
  });

  afterEach(() => {
    if (originalSupabaseUrl) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    }

    if (originalSupabaseAnonKey) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }

    if (originalAppUrl) {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }

    if (originalGoogleEnabled) {
      process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED = originalGoogleEnabled;
    } else {
      delete process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED;
    }

    if (originalKakaoEnabled) {
      process.env.NEXT_PUBLIC_AUTH_KAKAO_ENABLED = originalKakaoEnabled;
    } else {
      delete process.env.NEXT_PUBLIC_AUTH_KAKAO_ENABLED;
    }

    if (originalNaverEnabled) {
      process.env.NEXT_PUBLIC_AUTH_NAVER_ENABLED = originalNaverEnabled;
    } else {
      delete process.env.NEXT_PUBLIC_AUTH_NAVER_ENABLED;
    }
  });

  it('skips client creation and sets anonymous state when Supabase env is missing', async () => {
    const { useAuth } = await import('./useAuth');

    renderHook(() => useAuth());

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(null);
    });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('throws friendly error from signInWithProvider when Supabase env is missing', async () => {
    const { useAuth } = await import('./useAuth');

    const { result } = renderHook(() => useAuth());

    await expect(result.current.signInWithProvider('google')).rejects.toThrow(
      '인증 서비스 설정이 누락되어 로그인을 사용할 수 없습니다.'
    );
    expect(createClientMock).not.toHaveBeenCalled();
    expect(mockSetLoading).not.toHaveBeenCalled();
  });

  it('throws provider configuration error when provider env is unavailable', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { useAuth } = await import('./useAuth');

    const { result } = renderHook(() => useAuth());

    await expect(result.current.signInWithProvider('google')).rejects.toThrow(
      'Google 로그인 설정이 아직 완료되지 않았습니다.'
    );
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(mockSignInWithOAuth).not.toHaveBeenCalled();
  });

  it('falls back to local logout on signOut when Supabase env is missing', async () => {
    const { useAuth } = await import('./useAuth');

    const { result } = renderHook(() => useAuth());

    await result.current.signOut();

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('uses Supabase OAuth flow normally when env is present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.NEXT_PUBLIC_APP_URL = 'https://paintshare.example.com';
    process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED = 'true';

    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://oauth.example.com' }, error: null });

    const { useAuth } = await import('./useAuth');

    const { result } = renderHook(() => useAuth());

    await result.current.signInWithProvider('google', '/draw?room=abc');

    expect(createClientMock).toHaveBeenCalledTimes(2);
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://paintshare.example.com/draw?room=abc',
      },
    });
    expect(mockSetLoading).toHaveBeenCalledWith(true);
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });
});
