import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockPush = vi.fn();
const mockSetUser = vi.fn();
const mockSetLoading = vi.fn();
const mockLogout = vi.fn();

const mockSignInWithPassword = vi.fn();
const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignUp = vi.fn();
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

  beforeEach(() => {
    vi.clearAllMocks();

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    createClientMock.mockReturnValue({
      auth: {
        getUser: mockGetUser,
        onAuthStateChange: mockOnAuthStateChange,
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
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
  });

  it('skips client creation and sets anonymous state when Supabase env is missing', async () => {
    const { useAuth } = await import('./useAuth');

    renderHook(() => useAuth());

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(null);
    });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('throws friendly error from signIn when Supabase env is missing', async () => {
    const { useAuth } = await import('./useAuth');

    const { result } = renderHook(() => useAuth());

    await expect(result.current.signIn('test@example.com', 'password')).rejects.toThrow(
      '인증 서비스 설정이 누락되어 로그인을 사용할 수 없습니다.'
    );
    expect(createClientMock).not.toHaveBeenCalled();
    expect(mockSetLoading).not.toHaveBeenCalled();
  });

  it('falls back to local logout on signOut when Supabase env is missing', async () => {
    const { useAuth } = await import('./useAuth');

    const { result } = renderHook(() => useAuth());

    await result.current.signOut();

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('uses Supabase signIn flow normally when env is present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });

    const { useAuth } = await import('./useAuth');

    const { result } = renderHook(() => useAuth());

    await result.current.signIn('test@example.com', 'password');

    expect(createClientMock).toHaveBeenCalled();
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
    expect(mockPush).toHaveBeenCalledWith('/feed');
    expect(mockSetLoading).toHaveBeenCalledWith(true);
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });
});
