import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import Home from './page';

describe('Home page critical flow', () => {
  it('renders landing hero and primary navigation links', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: 'PaintShare' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '그림 그리기' })).toHaveAttribute('href', '/draw');
    expect(screen.getByRole('link', { name: '피드 구경하기' })).toHaveAttribute('href', '/feed');
    expect(screen.getByRole('link', { name: /VS\s*실시간 대결하기/ })).toHaveAttribute(
      'href',
      '/battle'
    );
  });
});
