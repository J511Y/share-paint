import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CanvasActions } from './CanvasActions';

describe('CanvasActions', () => {
  const defaultProps = {
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onClear: vi.fn(),
    onExport: vi.fn(),
    canUndo: true,
    canRedo: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Undo, Redo, Clear, Export 버튼을 렌더링한다', () => {
    render(<CanvasActions {...defaultProps} />);

    expect(screen.getByRole('button', { name: /실행취소/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /다시실행/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /초기화/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /(내보내기|다운로드)/i })).toBeInTheDocument();
  });

  it('Undo 버튼 클릭 시 onUndo를 호출한다', async () => {
    const user = userEvent.setup();
    render(<CanvasActions {...defaultProps} />);

    const undoButton = screen.getByRole('button', { name: /실행취소/i });
    await user.click(undoButton);

    expect(defaultProps.onUndo).toHaveBeenCalledTimes(1);
  });

  it('Redo 버튼 클릭 시 onRedo를 호출한다', async () => {
    const user = userEvent.setup();
    render(<CanvasActions {...defaultProps} />);

    const redoButton = screen.getByRole('button', { name: /다시실행/i });
    await user.click(redoButton);

    expect(defaultProps.onRedo).toHaveBeenCalledTimes(1);
  });

  it('Clear 버튼 클릭 시 onClear를 호출한다', async () => {
    const user = userEvent.setup();
    render(<CanvasActions {...defaultProps} />);

    const clearButton = screen.getByRole('button', { name: /초기화/i });
    await user.click(clearButton);

    expect(defaultProps.onClear).toHaveBeenCalledTimes(1);
  });

  it('Export 버튼 클릭 시 onExport를 호출한다', async () => {
    const user = userEvent.setup();
    render(<CanvasActions {...defaultProps} />);

    const exportButton = screen.getByRole('button', { name: /(내보내기|다운로드)/i });
    await user.click(exportButton);

    expect(defaultProps.onExport).toHaveBeenCalledTimes(1);
  });

  it('canUndo가 false일 때 Undo 버튼이 비활성화된다', () => {
    render(<CanvasActions {...defaultProps} canUndo={false} />);

    const undoButton = screen.getByRole('button', { name: /실행취소/i });
    expect(undoButton).toBeDisabled();
  });

  it('canRedo가 false일 때 Redo 버튼이 비활성화된다', () => {
    render(<CanvasActions {...defaultProps} canRedo={false} />);

    const redoButton = screen.getByRole('button', { name: /다시실행/i });
    expect(redoButton).toBeDisabled();
  });

  it('비활성화된 Undo 버튼 클릭 시 onUndo를 호출하지 않는다', async () => {
    const user = userEvent.setup();
    render(<CanvasActions {...defaultProps} canUndo={false} />);

    const undoButton = screen.getByRole('button', { name: /실행취소/i });
    await user.click(undoButton);

    expect(defaultProps.onUndo).not.toHaveBeenCalled();
  });

  it('비활성화된 Redo 버튼 클릭 시 onRedo를 호출하지 않는다', async () => {
    const user = userEvent.setup();
    render(<CanvasActions {...defaultProps} canRedo={false} />);

    const redoButton = screen.getByRole('button', { name: /다시실행/i });
    await user.click(redoButton);

    expect(defaultProps.onRedo).not.toHaveBeenCalled();
  });

  it('Clear 버튼은 항상 활성화되어 있다', () => {
    render(<CanvasActions {...defaultProps} canUndo={false} canRedo={false} />);

    const clearButton = screen.getByRole('button', { name: /초기화/i });
    expect(clearButton).not.toBeDisabled();
  });

  it('Export 버튼은 항상 활성화되어 있다', () => {
    render(<CanvasActions {...defaultProps} canUndo={false} canRedo={false} />);

    const exportButton = screen.getByRole('button', { name: /(내보내기|다운로드)/i });
    expect(exportButton).not.toBeDisabled();
  });

  it('버튼들에 lucide-react 아이콘이 있다', () => {
    render(<CanvasActions {...defaultProps} />);

    // 버튼 내부에 svg 아이콘이 있는지 확인
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });
});
