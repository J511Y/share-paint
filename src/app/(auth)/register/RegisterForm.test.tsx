import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RegisterForm } from './RegisterForm';

describe('RegisterForm (guest-first)', () => {
  it('renders guest-first CTA buttons', () => {
    render(<RegisterForm />);

    expect(screen.getByText('회원가입 없이 시작하세요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '게스트로 시작하기' })).toHaveAttribute('href', '/feed');
    expect(screen.getByRole('link', { name: '실시간 대결 보러가기' })).toHaveAttribute('href', '/battle');
  });
});
