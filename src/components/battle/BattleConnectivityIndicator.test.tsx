import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BattleConnectivityIndicator } from './BattleConnectivityIndicator';
import { BATTLE_CONNECTIVITY_EVENT } from '@/lib/observability/battle-connectivity';

describe('BattleConnectivityIndicator', () => {
  it('기본 상태에서 정상 연결 텍스트를 표시한다', () => {
    render(<BattleConnectivityIndicator />);

    expect(screen.getByText('연결 상태: 정상')).toBeInTheDocument();
  });

  it('degraded 이벤트 수신 시 불안정 상태를 표시한다', async () => {
    render(<BattleConnectivityIndicator />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(BATTLE_CONNECTIVITY_EVENT, {
          detail: { status: 'degraded', retryMs: 30000, at: Date.now() },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('연결 상태: 불안정 (자동 재시도 30초)')).toBeInTheDocument();
    });
  });

  it('recovered 이벤트 수신 시 복구 상태를 표시한다', async () => {
    render(<BattleConnectivityIndicator />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(BATTLE_CONNECTIVITY_EVENT, {
          detail: { status: 'recovered', retryMs: 10000, at: Date.now() },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('연결 상태: 복구됨')).toBeInTheDocument();
    });
  });
});
