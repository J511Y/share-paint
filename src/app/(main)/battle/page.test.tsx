import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BattleLobbyPage from './page';

vi.mock('@/components/battle', () => ({
  BattleConnectivityIndicator: () => <span>연결 상태: 정상</span>,
  BattleList: () => <div data-testid="battle-list" />,
  CreateBattleModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="create-modal-open" /> : null,
}));

describe('BattleLobbyPage', () => {
  it('연결 상태 칩과 방 만들기 CTA를 함께 렌더링한다', () => {
    render(<BattleLobbyPage />);

    expect(screen.getByText('연결 상태: 정상')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '방 만들기' })).toBeInTheDocument();
    expect(screen.getByTestId('battle-list')).toBeInTheDocument();
  });
});
