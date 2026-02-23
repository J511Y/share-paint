import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm (guest-first)', () => {
  it('renders guest-first messaging and guest action buttons', () => {
    render(<LoginForm />);

    expect(screen.getByText('게스트 모드가 기본입니다')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '게스트로 계속하기' })).toHaveAttribute('href', '/feed');
    expect(screen.getByRole('link', { name: '바로 그림 그리기' })).toHaveAttribute('href', '/draw');
  });
});
