import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from './RegisterForm';

const mockSearchParams = new URLSearchParams();
const mockSignInWithProvider = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('RegisterForm (social only)', () => {
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
    render(<RegisterForm />);

    expect(screen.getByRole('button', { name: 'Google로 시작하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kakao로 시작하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Naver로 시작하기' })).toBeInTheDocument();

    expect(screen.queryByLabelText('이메일')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('비밀번호')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('비밀번호 확인')).not.toBeInTheDocument();
  });

  it('invokes provider OAuth action with safe redirect target', async () => {
    const user = userEvent.setup();
    mockSearchParams.set('redirect', '/battle?room=777');

    render(<RegisterForm />);

    await user.click(screen.getByRole('button', { name: 'Kakao로 시작하기' }));

    expect(mockSignInWithProvider).toHaveBeenCalledWith('kakao', '/battle?room=777');
  });

  it('shows fallback message when provider is unavailable', () => {
    mockUseAuth.mockReturnValue({
      signInWithProvider: mockSignInWithProvider,
      isLoading: false,
      providerStatuses: {
        google: { available: true },
        kakao: { available: true },
        naver: { available: false, message: 'Naver 로그인 설정이 아직 완료되지 않았습니다.' },
      },
    });

    render(<RegisterForm />);

    const naverButton = screen.getByRole('button', { name: 'Naver로 시작하기' });
    expect(naverButton).toBeDisabled();
    expect(screen.getByText('Naver 로그인 설정이 아직 완료되지 않았습니다.')).toBeInTheDocument();
  });
});
