import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CanvasToolbar } from './CanvasToolbar';

const mockSetTool = vi.fn();
const mockSetPreset = vi.fn();

const mockStoreState = {
  tool: 'pen',
  activePreset: 'pencil',
  setTool: mockSetTool,
  setPreset: mockSetPreset,
};

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: vi.fn((selector) => {
    return typeof selector === 'function' ? selector(mockStoreState) : mockStoreState;
  }),
}));

describe('CanvasToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.tool = 'pen';
    mockStoreState.activePreset = 'pencil';
  });

  it('기본/마커/브러시/형광/지우개/채우기 버튼을 렌더링한다', () => {
    render(<CanvasToolbar />);

    expect(screen.getByRole('button', { name: /기본 펜/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /마커 펜/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /브러시 펜/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /형광 펜/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /지우개/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /채우기/i })).toBeInTheDocument();
  });

  it('현재 선택된 프리셋이 하이라이트된다', () => {
    render(<CanvasToolbar />);

    const pencilButton = screen.getByRole('button', { name: /기본 펜/i });
    expect(pencilButton).toHaveAttribute('data-selected', 'true');
  });

  it('채우기 툴 선택 시 setTool("fill")을 호출한다', async () => {
    const user = userEvent.setup();
    render(<CanvasToolbar />);

    await user.click(screen.getByRole('button', { name: /채우기/i }));

    expect(mockSetTool).toHaveBeenCalledWith('fill');
  });

  it('프리셋 클릭 시 setPreset을 호출한다', async () => {
    const user = userEvent.setup();
    render(<CanvasToolbar />);

    await user.click(screen.getByRole('button', { name: /브러시 펜/i }));

    expect(mockSetPreset).toHaveBeenCalledWith('brush');
  });

  it('도구바가 세로로 정렬된다', () => {
    render(<CanvasToolbar />);

    expect(screen.getByRole('toolbar')).toHaveClass('flex-col');
  });

  it('horizontal prop이 true일 때 가로로 정렬된다', () => {
    render(<CanvasToolbar horizontal />);

    expect(screen.getByRole('toolbar')).toHaveClass('flex-row');
  });

  it('fill 툴 활성 상태를 표시한다', () => {
    mockStoreState.tool = 'fill';
    render(<CanvasToolbar />);

    const fillButton = screen.getByRole('button', { name: /채우기/i });
    expect(fillButton).toHaveAttribute('data-selected', 'true');
  });
});
