import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeedContent } from './FeedContent';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/feed/PaintingCard', () => ({
  PaintingCard: ({ painting }: { painting: { id: string } }) => (
    <div data-testid="painting-card">{painting.id}</div>
  ),
}));

describe('FeedContent', () => {
  it('빈 피드에서 주요 CTA 계층을 보여준다', () => {
    render(<FeedContent initialPaintings={[]} />);

    expect(screen.getByRole('link', { name: '그림 그리기 시작' })).toHaveAttribute('href', '/draw');
    expect(screen.getByRole('link', { name: /대결방 둘러보기/ })).toHaveAttribute('href', '/battle');
    expect(screen.getByText(/빠르게 시작:/)).toBeInTheDocument();
  });

  it('그림이 있으면 카드 목록을 렌더링한다', () => {
    render(
      <FeedContent
        initialPaintings={[
          { id: 'p-1', profile: null } as never,
          { id: 'p-2', profile: null } as never,
        ]}
      />
    );

    expect(screen.getAllByTestId('painting-card')).toHaveLength(2);
  });
});
