import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CanvasToolbar } from './CanvasToolbar';

// useCanvasStore 모킹
const mockSetTool = vi.fn();

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: vi.fn((selector) => {
    const state = {
      tool: 'pen',
      setTool: mockSetTool,
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

describe('CanvasToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('펜, 지우개, 채우기 도구 버튼을 렌더링한다', () => {
    render(<CanvasToolbar />);

    expect(screen.getByRole('button', { name: /펜/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /지우개/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /채우기/i })).toBeInTheDocument();
  });

  it('현재 선택된 도구가 하이라이트된다', async () => {
    const { useCanvasStore } = await import('@/stores/canvasStore');
    vi.mocked(useCanvasStore).mockImplementation((selector: unknown) => {
      const state = { tool: 'pen', setTool: mockSetTool };
      return typeof selector === 'function' ? (selector as (s: typeof state) => unknown)(state) : state;
    });

    render(<CanvasToolbar />);

    const penButton = screen.getByRole('button', { name: /펜/i });
    expect(penButton).toHaveAttribute('data-selected', 'true');
  });

  it('펜 버튼 클릭 시 setTool("pen")을 호출한다', async () => {
    const user = userEvent.setup();
    render(<CanvasToolbar />);

    const penButton = screen.getByRole('button', { name: /펜/i });
    await user.click(penButton);

    expect(mockSetTool).toHaveBeenCalledWith('pen');
  });

  it('지우개 버튼 클릭 시 setTool("eraser")을 호출한다', async () => {
    const user = userEvent.setup();
    render(<CanvasToolbar />);

    const eraserButton = screen.getByRole('button', { name: /지우개/i });
    await user.click(eraserButton);

    expect(mockSetTool).toHaveBeenCalledWith('eraser');
  });

  it('채우기 버튼 클릭 시 setTool("fill")을 호출한다', async () => {
    const user = userEvent.setup();
    render(<CanvasToolbar />);

    const fillButton = screen.getByRole('button', { name: /채우기/i });
    await user.click(fillButton);

    expect(mockSetTool).toHaveBeenCalledWith('fill');
  });

  it('선택되지 않은 도구는 하이라이트되지 않는다', () => {
    render(<CanvasToolbar />);

    const eraserButton = screen.getByRole('button', { name: /지우개/i });
    const fillButton = screen.getByRole('button', { name: /채우기/i });

    expect(eraserButton).toHaveAttribute('data-selected', 'false');
    expect(fillButton).toHaveAttribute('data-selected', 'false');
  });

  it('도구바가 세로로 정렬된다', () => {
    render(<CanvasToolbar />);

    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveClass('flex-col');
  });

  it('horizontal prop이 true일 때 가로로 정렬된다', () => {
    render(<CanvasToolbar horizontal />);

    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveClass('flex-row');
  });
});
