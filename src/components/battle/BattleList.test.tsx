import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BattleList } from './BattleList';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('BattleList', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetch 실패 시 오류 배너와 다시 시도 버튼을 표시한다', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));

    render(<BattleList initialBattles={[]} />);

    expect(
      await screen.findByText('대결방 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
    ).toBeInTheDocument();
    expect(screen.getByText('자동 재시도 30초')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
    expect(screen.getByText(/잠시 후 다시 시도하거나, 게스트 ID 재발급 후 재시도해보세요/)).toBeInTheDocument();
  });

  it('다시 시도 버튼 클릭 시 목록 재요청을 수행한다', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

    const user = userEvent.setup();
    render(<BattleList initialBattles={[]} />);

    const retryButton = await screen.findByRole('button', { name: '다시 시도' });
    await user.click(retryButton);

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('연속 실패 시 자동 재시도 주기를 60초로 늘린다', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));
    const user = userEvent.setup();

    render(<BattleList initialBattles={[]} />);

    await screen.findByText('자동 재시도 30초');

    await user.click(screen.getByRole('button', { name: '다시 시도' }));

    await waitFor(() => {
      expect(screen.getByText('자동 재시도 60초')).toBeInTheDocument();
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
