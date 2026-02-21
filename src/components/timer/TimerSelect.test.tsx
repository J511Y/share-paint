import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TimerSelect } from './TimerSelect';

describe('TimerSelect', () => {
  // defaultOptions는 참조용으로 유지
  const _defaultOptions = [
    { label: '30초', value: 30 },
    { label: '1분', value: 60 },
    { label: '3분', value: 180 },
    { label: '5분', value: 300 },
    { label: '10분', value: 600 },
  ];

  describe('렌더링', () => {
    it('모든 시간 옵션이 표시된다', () => {
      render(<TimerSelect value={60} onChange={() => {}} />);

      expect(screen.getByRole('button', { name: '30초' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1분' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3분' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '5분' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '10분' })).toBeInTheDocument();
    });

    it('커스텀 옵션이 전달되면 커스텀 옵션이 표시된다', () => {
      const customOptions = [
        { label: '15초', value: 15 },
        { label: '45초', value: 45 },
      ];

      render(<TimerSelect value={15} onChange={() => {}} options={customOptions} />);

      expect(screen.getByRole('button', { name: '15초' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '45초' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '30초' })).not.toBeInTheDocument();
    });
  });

  describe('선택', () => {
    it('선택된 값이 시각적으로 구분된다', () => {
      render(<TimerSelect value={60} onChange={() => {}} />);

      const selectedButton = screen.getByRole('button', { name: '1분' });
      expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('선택되지 않은 버튼은 aria-pressed가 false이다', () => {
      render(<TimerSelect value={60} onChange={() => {}} />);

      const unselectedButton = screen.getByRole('button', { name: '30초' });
      expect(unselectedButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('버튼 클릭 시 onChange가 호출된다', () => {
      const onChange = vi.fn();
      render(<TimerSelect value={60} onChange={onChange} />);

      fireEvent.click(screen.getByRole('button', { name: '3분' }));

      expect(onChange).toHaveBeenCalledWith(180);
    });

    it('이미 선택된 버튼 클릭 시에도 onChange가 호출된다', () => {
      const onChange = vi.fn();
      render(<TimerSelect value={60} onChange={onChange} />);

      fireEvent.click(screen.getByRole('button', { name: '1분' }));

      expect(onChange).toHaveBeenCalledWith(60);
    });
  });

  describe('disabled', () => {
    it('disabled가 true면 모든 버튼이 비활성화된다', () => {
      render(<TimerSelect value={60} onChange={() => {}} disabled />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('disabled 상태에서 클릭해도 onChange가 호출되지 않는다', () => {
      const onChange = vi.fn();
      render(<TimerSelect value={60} onChange={onChange} disabled />);

      fireEvent.click(screen.getByRole('button', { name: '3분' }));

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('크기', () => {
    it('size="sm"일 때 작은 버튼이 렌더링된다', () => {
      render(<TimerSelect value={60} onChange={() => {}} size="sm" />);

      const button = screen.getByRole('button', { name: '1분' });
      expect(button).toHaveClass('text-sm');
    });

    it('size="lg"일 때 큰 버튼이 렌더링된다', () => {
      render(<TimerSelect value={60} onChange={() => {}} size="lg" />);

      const button = screen.getByRole('button', { name: '1분' });
      expect(button).toHaveClass('text-lg');
    });

    it('기본 size는 md이다', () => {
      render(<TimerSelect value={60} onChange={() => {}} />);

      const button = screen.getByRole('button', { name: '1분' });
      expect(button).toHaveClass('text-base');
    });
  });

  describe('레이아웃', () => {
    it('버튼들이 flex 컨테이너 안에 있다', () => {
      render(<TimerSelect value={60} onChange={() => {}} />);

      const container = screen.getByRole('group');
      expect(container).toHaveClass('flex');
    });

    it('버튼 그룹에 적절한 역할이 있다', () => {
      render(<TimerSelect value={60} onChange={() => {}} />);

      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('aria-label이 적절하게 설정된다', () => {
      render(<TimerSelect value={60} onChange={() => {}} />);

      expect(screen.getByRole('group')).toHaveAttribute('aria-label', '시간 제한 선택');
    });
  });

  describe('접근성', () => {
    it('키보드로 탐색할 수 있다', () => {
      render(<TimerSelect value={60} onChange={() => {}} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('스타일링', () => {
    it('className prop이 컨테이너에 적용된다', () => {
      render(<TimerSelect value={60} onChange={() => {}} className="my-custom-class" />);

      const container = screen.getByRole('group');
      expect(container).toHaveClass('my-custom-class');
    });

    it('선택된 버튼에 primary 스타일이 적용된다', () => {
      render(<TimerSelect value={60} onChange={() => {}} />);

      const selectedButton = screen.getByRole('button', { name: '1분' });
      expect(selectedButton).toHaveClass('bg-purple-600');
    });

    it('선택되지 않은 버튼에 secondary 스타일이 적용된다', () => {
      render(<TimerSelect value={60} onChange={() => {}} />);

      const unselectedButton = screen.getByRole('button', { name: '30초' });
      expect(unselectedButton).toHaveClass('bg-gray-100');
    });
  });
});
