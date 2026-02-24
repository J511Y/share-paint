import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateBattleModal } from './CreateBattleModal';

const pushMock = vi.fn();
const errorToastMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ error: errorToastMock }),
}));

describe('CreateBattleModal', () => {
  it('생성 실패 시 인라인 오류 안내를 표시한다', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ message: '요청이 너무 많습니다.' }),
    } as Response);

    const user = userEvent.setup();

    render(<CreateBattleModal isOpen onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('같이 그림 그리실 분!'), '테스트 배틀');
    await user.click(screen.getByRole('button', { name: '만들기' }));

    expect(await screen.findByText('대결방을 만들지 못했어요.')).toBeInTheDocument();
    expect(screen.getByText(/잠시 후 다시 시도하거나/)).toBeInTheDocument();
    expect(errorToastMock).toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
