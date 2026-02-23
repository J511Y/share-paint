import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

const mockSearchParams = new URLSearchParams();
const mockSignInWithProvider = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('LoginForm (social only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('redirect');

    mockUseAuth.mockReturnValue({
      signInWithProvider: mockSignInWithProvider,
      isLoading: false,
      providerStatuses: {
        google: { available: true },
        kakao: { available: true },
        naver: { available: true },
      },
    });
  });

  it('renders only social auth buttons and hides email/password form fields', () => {
    render(<LoginForm />);

    expect(screen.getByRole('button', { name: 'Google로 계속하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kakao로 계속하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Naver로 계속하기' })).toBeInTheDocument();

    expect(screen.queryByLabelText('이메일')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('비밀번호')).not.toBeInTheDocument();
  });

  it('invokes provider OAuth action with safe redirect target', async () => {
    const user = userEvent.setup();
    mockSearchParams.set('redirect', '/draw?room=abc');

    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: 'Google로 계속하기' }));

    expect(mockSignInWithProvider).toHaveBeenCalledWith('google', '/draw?room=abc');
  });

  it('shows fallback message when provider is unavailable', () => {
    mockUseAuth.mockReturnValue({
      signInWithProvider: mockSignInWithProvider,
      isLoading: false,
      providerStatuses: {
        google: { available: false, message: 'Google 로그인은 현재 일시적으로 사용할 수 없습니다.' },
        kakao: { available: true },
        naver: { available: true },
      },
    });

    render(<LoginForm />);

    const googleButton = screen.getByRole('button', { name: 'Google로 계속하기' });
    expect(googleButton).toBeDisabled();
    expect(screen.getByText('Google 로그인은 현재 일시적으로 사용할 수 없습니다.')).toBeInTheDocument();
  });
});
