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

  it('shows lock guidance when topic is locked', async () => {
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

    render(<RandomTopicSelector onTopicSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '주제 뽑기' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '주제 고정' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '주제 고정' }));

    expect(screen.getByRole('button', { name: '주제 고정됨' })).toBeDisabled();
    expect(screen.getByText('주제가 고정되어 있어요. 잠금 해제 후 새 주제를 뽑을 수 있습니다.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '주제 잠금 해제' }));
    expect(screen.getByRole('button', { name: '다른 주제 뽑기' })).toBeEnabled();
  });
});
