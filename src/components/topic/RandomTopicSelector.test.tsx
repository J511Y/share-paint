import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RandomTopicSelector } from './RandomTopicSelector';

describe('RandomTopicSelector', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows API error message when random topic request fails', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: '등록된 주제가 없습니다.' }),
      } as Response)
      .mockResolvedValueOnce({
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
      expect(screen.getByText('등록된 주제가 없습니다.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
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

    expect(screen.getByText('고양이 우주 비행사')).toHaveAttribute('role', 'status');
    expect(screen.getByText('카테고리: 일반')).toBeInTheDocument();
    expect(screen.getByText('난이도: 쉬움')).toBeInTheDocument();
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
      expect(screen.getByLabelText('주제 고정')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('주제 고정'));

    expect(screen.getByLabelText('주제 잠금 해제')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '주제 고정됨' })).toBeDisabled();
    expect(screen.getByText('주제가 고정되어 있어요. 잠금 해제 후 새 주제를 뽑을 수 있습니다.')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('주제 잠금 해제'));
    expect(screen.getByRole('button', { name: '다른 주제 뽑기' })).toBeEnabled();
  });

  it('prevents duplicate requests while loading', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                id: '11111111-1111-4111-8111-111111111111',
                content: '고양이 우주 비행사',
                category: 'general',
                difficulty: 'easy',
                created_at: '2026-02-28T00:00:00.000Z',
              }),
            } as Response);
          }, 30);
        })
    );

    const { container } = render(<RandomTopicSelector onTopicSelect={vi.fn()} />);

    const drawButton = screen.getByRole('button', { name: '주제 뽑기' });
    fireEvent.click(drawButton);
    fireEvent.click(drawButton);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(container.querySelector('[aria-busy="false"]')).toBeInTheDocument();
    });
  });
});
