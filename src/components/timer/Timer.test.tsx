import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Timer } from './Timer';

describe('Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('시간 표시', () => {
    it('남은 시간을 MM:SS 형식으로 표시한다', () => {
      render(<Timer duration={65} />);

      expect(screen.getByText('01:05')).toBeInTheDocument();
    });

    it('1분 미만일 때 00:SS 형식으로 표시한다', () => {
      render(<Timer duration={30} />);

      expect(screen.getByText('00:30')).toBeInTheDocument();
    });

    it('10분을 올바르게 표시한다', () => {
      render(<Timer duration={600} />);

      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
  });

  describe('진행률 바', () => {
    it('진행률 바가 렌더링된다', () => {
      render(<Timer duration={60} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('진행률이 aria-valuenow에 반영된다', () => {
      render(<Timer duration={60} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  describe('버튼 상태', () => {
    it('초기 상태에서 시작 버튼이 보인다', () => {
      render(<Timer duration={60} />);

      expect(screen.getByRole('button', { name: /시작/i })).toBeInTheDocument();
    });

    it('시작 버튼 클릭 시 일시정지 버튼으로 변경된다', () => {
      render(<Timer duration={60} />);

      const startButton = screen.getByRole('button', { name: /시작/i });
      fireEvent.click(startButton);

      expect(screen.getByRole('button', { name: /일시정지/i })).toBeInTheDocument();
    });

    it('일시정지 버튼 클릭 시 재개 버튼으로 변경된다', () => {
      render(<Timer duration={60} />);

      fireEvent.click(screen.getByRole('button', { name: /시작/i }));

      // 시간이 조금 지나야 일시정지 후 재개 버튼이 나타남
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      fireEvent.click(screen.getByRole('button', { name: /일시정지/i }));

      expect(screen.getByRole('button', { name: /재개/i })).toBeInTheDocument();
    });
  });

  describe('경고 색상', () => {
    it('10초 이하일 때 경고 색상이 표시된다', () => {
      render(<Timer duration={10} autoStart />);

      const timerDisplay = screen.getByTestId('timer-display');
      expect(timerDisplay).toHaveClass('text-red-500');
    });

    it('10초 초과일 때 기본 색상이 표시된다', () => {
      render(<Timer duration={60} />);

      const timerDisplay = screen.getByTestId('timer-display');
      expect(timerDisplay).not.toHaveClass('text-red-500');
    });
  });

  describe('콜백', () => {
    it('시간 종료 시 onComplete 콜백이 호출된다', () => {
      const onComplete = vi.fn();
      render(<Timer duration={1} autoStart onComplete={onComplete} />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('onTimeUpdate 콜백이 매초 호출된다', () => {
      const onTimeUpdate = vi.fn();
      render(<Timer duration={60} autoStart onTimeUpdate={onTimeUpdate} />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // 초기 렌더링 시 한 번 + 3초 동안 3번 = 최소 3번 이상 호출
      expect(onTimeUpdate).toHaveBeenCalled();
      expect(onTimeUpdate.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('variant', () => {
    it('linear variant에서 선형 진행률 바가 표시된다', () => {
      render(<Timer duration={60} variant="linear" />);

      expect(screen.getByTestId('linear-progress')).toBeInTheDocument();
    });

    it('circular variant에서 원형 진행률 바가 표시된다', () => {
      render(<Timer duration={60} variant="circular" />);

      expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
    });

    it('기본 variant는 linear이다', () => {
      render(<Timer duration={60} />);

      expect(screen.getByTestId('linear-progress')).toBeInTheDocument();
    });
  });

  describe('showControls', () => {
    it('showControls가 false면 버튼이 숨겨진다', () => {
      render(<Timer duration={60} showControls={false} />);

      expect(screen.queryByRole('button', { name: /시작/i })).not.toBeInTheDocument();
    });

    it('showControls 기본값은 true이다', () => {
      render(<Timer duration={60} />);

      expect(screen.getByRole('button', { name: /시작/i })).toBeInTheDocument();
    });
  });

  describe('완료 상태', () => {
    it('완료 시 완료 메시지가 표시된다', () => {
      render(<Timer duration={1} autoStart />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText(/시간 종료/i)).toBeInTheDocument();
    });

    it('완료 후 리셋 버튼이 표시된다', () => {
      render(<Timer duration={1} autoStart />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByRole('button', { name: /다시 시작/i })).toBeInTheDocument();
    });
  });

  describe('접근성', () => {
    it('타이머에 적절한 aria-label이 있다', () => {
      render(<Timer duration={60} />);

      expect(screen.getByLabelText(/타이머/i)).toBeInTheDocument();
    });

    it('진행률 바에 적절한 ARIA 속성이 있다', () => {
      render(<Timer duration={60} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });
});
