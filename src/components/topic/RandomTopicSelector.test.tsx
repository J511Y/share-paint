import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RandomTopicSelector } from './RandomTopicSelector';

describe('RandomTopicSelector', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows API error message when random topic request fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ message: '등록된 주제가 없습니다.' }),
    } as Response);

    render(<RandomTopicSelector onTopicSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '주제 뽑기' }));

    await waitFor(() => {
      expect(screen.getByText('등록된 주제가 없습니다.')).toBeInTheDocument();
    });
  });

  it('calls onTopicSelect when topic request succeeds', async () => {
    const onTopicSelect = vi.fn();
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        id: '11111111-1111-4111-8111-111111111111',
        content: '고양이 우주 비행사',
        category: 'general',
        difficulty: 'easy',
        created_at: '2026-02-28T00:00:00.000Z',
      }),
    } as Response);

    render(<RandomTopicSelector onTopicSelect={onTopicSelect} />);

    fireEvent.click(screen.getByRole('button', { name: '주제 뽑기' }));

    await waitFor(() => {
      expect(onTopicSelect).toHaveBeenCalledWith('고양이 우주 비행사');
    });
  });
});
