import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorPicker } from './ColorPicker';

const mockSetBrushColor = vi.fn();

const mockStoreState = {
  brush: { color: '#111827', size: 5, opacity: 1, style: 'pencil' as const },
  recentColors: ['#111827', '#EF4444', '#3B82F6', '#22C55E'],
  setBrushColor: mockSetBrushColor,
};

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: vi.fn((selector) => {
    return typeof selector === 'function' ? selector(mockStoreState) : mockStoreState;
  }),
}));

describe('ColorPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockStoreState.brush.color = '#111827';
  });

  it('현재 색상 표시를 렌더링한다', () => {
    render(<ColorPicker />);

    expect(screen.getByTestId('current-color')).toBeInTheDocument();
  });

  it('빠른 팔레트 버튼들을 렌더링한다', () => {
    render(<ColorPicker />);

    const colorButtons = screen.getAllByRole('button');
    expect(colorButtons.length).toBeGreaterThanOrEqual(8);
  });

  it('커스텀 색상 입력을 렌더링한다', () => {
    render(<ColorPicker />);

    const colorInput = screen.getByRole('textbox', { name: /커스텀 색상/i });
    expect(colorInput).toBeInTheDocument();
    expect(colorInput).toHaveAttribute('type', 'color');
  });

  it('빠른 팔레트 클릭 시 setBrushColor를 호출한다', async () => {
    const user = userEvent.setup();
    render(<ColorPicker />);

    const redButton = screen.getByRole('button', { name: /레드 색상/i });
    await user.click(redButton);

    expect(mockSetBrushColor).toHaveBeenCalledWith('#EF4444');
  });

  it('커스텀 색상 변경 시 setBrushColor를 호출한다', () => {
    render(<ColorPicker />);

    const colorInput = screen.getByLabelText(/커스텀 색상/i);
    fireEvent.change(colorInput, { target: { value: '#00ff00' } });

    expect(mockSetBrushColor).toHaveBeenCalledWith('#00ff00');
  });

  it('최근 사용 색상 버튼을 렌더링한다', () => {
    render(<ColorPicker />);

    expect(screen.getByRole('button', { name: /최근 색상 #111827 선택됨/i })).toBeInTheDocument();
  });

  it('고급 색상 패널을 펼칠 수 있다', async () => {
    const user = userEvent.setup();
    render(<ColorPicker />);

    const toggleButton = screen.getByRole('button', { name: /고급 색상 패널/i });
    await user.click(toggleButton);

    expect(screen.getByRole('button', { name: /#A21CAF 색상/i })).toBeInTheDocument();
  });

  it('현재 색상을 즐겨찾기에 추가하고 렌더링한다', async () => {
    const user = userEvent.setup();
    render(<ColorPicker />);

    await user.click(screen.getByRole('button', { name: /현재 색상 즐겨찾기 추가/i }));

    expect(screen.getByRole('button', { name: /즐겨찾기 색상 #111827 선택됨/i })).toBeInTheDocument();
  });

  it('저장된 즐겨찾기를 로드한다', () => {
    localStorage.setItem('paintshare.favorite.colors.v1', JSON.stringify(['#EF4444']));

    render(<ColorPicker />);

    expect(screen.getByRole('button', { name: /즐겨찾기 색상 #EF4444/i })).toBeInTheDocument();
  });

  it('즐겨찾기 제거 버튼으로 항목을 삭제한다', async () => {
    localStorage.setItem('paintshare.favorite.colors.v1', JSON.stringify(['#EF4444']));
    const user = userEvent.setup();

    render(<ColorPicker />);

    await user.click(screen.getByRole('button', { name: /즐겨찾기 #EF4444 제거/i }));

    expect(screen.queryByRole('button', { name: /즐겨찾기 색상 #EF4444/i })).not.toBeInTheDocument();
  });

  it('즐겨찾기를 좌우 이동해 순서를 재정렬한다', async () => {
    localStorage.setItem('paintshare.favorite.colors.v1', JSON.stringify(['#EF4444', '#3B82F6']));
    const user = userEvent.setup();

    render(<ColorPicker />);

    await user.click(screen.getByRole('button', { name: /즐겨찾기 #EF4444 오른쪽으로 이동/i }));

    const order = JSON.parse(localStorage.getItem('paintshare.favorite.colors.v1') || '[]');
    expect(order).toEqual(['#3B82F6', '#EF4444']);
  });

  it('즐겨찾기 드래그 앤 드롭으로 순서를 재정렬한다', () => {
    localStorage.setItem(
      'paintshare.favorite.colors.v1',
      JSON.stringify(['#EF4444', '#3B82F6', '#22C55E'])
    );

    render(<ColorPicker />);

    const dragButton = screen.getByRole('button', { name: /즐겨찾기 색상 #22C55E/i });
    const dropTarget = screen.getByRole('button', { name: /즐겨찾기 색상 #EF4444/i });
    const dropZone = dropTarget.parentElement as HTMLElement;

    fireEvent.dragStart(dragButton);
    fireEvent.dragOver(dropZone);
    fireEvent.drop(dropZone);

    const order = JSON.parse(localStorage.getItem('paintshare.favorite.colors.v1') || '[]');
    expect(order).toEqual(['#22C55E', '#EF4444', '#3B82F6']);
  });
});
