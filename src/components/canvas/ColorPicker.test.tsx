import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorPicker } from './ColorPicker';

// useCanvasStore 모킹
const mockSetBrushColor = vi.fn();

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: vi.fn((selector) => {
    const state = {
      brush: { color: '#000000', size: 5, opacity: 1 },
      setBrushColor: mockSetBrushColor,
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

describe('ColorPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('프리셋 색상 버튼들을 렌더링한다', () => {
    render(<ColorPicker />);

    // 12개의 프리셋 색상 (검정색은 현재 선택 상태이므로 "선택됨"으로 표시)
    const colorButtons = screen.getAllByRole('button');
    expect(colorButtons.length).toBe(12);
  });

  it('커스텀 색상 입력을 렌더링한다', () => {
    render(<ColorPicker />);

    const colorInput = screen.getByRole('textbox', { name: /커스텀 색상/i });
    expect(colorInput).toBeInTheDocument();
    expect(colorInput).toHaveAttribute('type', 'color');
  });

  it('현재 선택된 색상을 표시한다', async () => {
    const { useCanvasStore } = await import('@/stores/canvasStore');
    vi.mocked(useCanvasStore).mockImplementation((selector: unknown) => {
      const state = {
        brush: { color: '#FF0000', size: 5, opacity: 1 },
        setBrushColor: mockSetBrushColor,
      };
      return typeof selector === 'function' ? (selector as (s: typeof state) => unknown)(state) : state;
    });

    render(<ColorPicker />);

    const currentColor = screen.getByTestId('current-color');
    expect(currentColor).toHaveStyle({ backgroundColor: '#FF0000' });
  });

  it('프리셋 색상 클릭 시 setBrushColor를 호출한다', async () => {
    const user = userEvent.setup();
    render(<ColorPicker />);

    // 빨간색 버튼 찾기 (첫 번째 프리셋 색상)
    const colorButtons = screen.getAllByRole('button', { name: /색상/i });
    await user.click(colorButtons[0]);

    expect(mockSetBrushColor).toHaveBeenCalled();
  });

  it('커스텀 색상 변경 시 setBrushColor를 호출한다', async () => {
    render(<ColorPicker />);

    const colorInput = screen.getByLabelText(/커스텀 색상/i);
    // color input은 change 이벤트로 값을 변경
    fireEvent.change(colorInput, { target: { value: '#00FF00' } });

    // 브라우저는 color input 값을 소문자로 변환
    expect(mockSetBrushColor).toHaveBeenCalledWith('#00ff00');
  });

  it('현재 선택된 프리셋 색상에 체크 표시가 있다', async () => {
    const { useCanvasStore } = await import('@/stores/canvasStore');
    vi.mocked(useCanvasStore).mockImplementation((selector: unknown) => {
      const state = {
        brush: { color: '#000000', size: 5, opacity: 1 },
        setBrushColor: mockSetBrushColor,
      };
      return typeof selector === 'function' ? (selector as (s: typeof state) => unknown)(state) : state;
    });

    render(<ColorPicker />);

    const selectedButton = screen.getByRole('button', { name: /검정색 선택됨/i });
    expect(selectedButton).toBeInTheDocument();
  });

  it('12가지 기본 프리셋 색상이 있다', () => {
    render(<ColorPicker />);

    // 각 색상에 대한 버튼이 존재하는지 확인
    const colorButtons = screen.getAllByRole('button');
    expect(colorButtons.length).toBe(12);
  });
});
