import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrushSizeSlider } from './BrushSizeSlider';

// useCanvasStore 모킹
const mockSetBrushSize = vi.fn();

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: vi.fn((selector) => {
    const state = {
      brush: { color: '#000000', size: 5, opacity: 1 },
      setBrushSize: mockSetBrushSize,
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

describe('BrushSizeSlider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('range input을 렌더링한다', () => {
    render(<BrushSizeSlider />);

    const slider = screen.getByRole('slider', { name: /브러시 크기/i });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('type', 'range');
  });

  it('최소값이 1이다', () => {
    render(<BrushSizeSlider />);

    const slider = screen.getByRole('slider', { name: /브러시 크기/i });
    expect(slider).toHaveAttribute('min', '1');
  });

  it('최대값이 50이다', () => {
    render(<BrushSizeSlider />);

    const slider = screen.getByRole('slider', { name: /브러시 크기/i });
    expect(slider).toHaveAttribute('max', '50');
  });

  it('현재 브러시 크기를 표시한다', async () => {
    const { useCanvasStore } = await import('@/stores/canvasStore');
    vi.mocked(useCanvasStore).mockImplementation((selector: unknown) => {
      const state = {
        brush: { color: '#000000', size: 10, opacity: 1 },
        setBrushSize: mockSetBrushSize,
      };
      return typeof selector === 'function' ? (selector as (s: typeof state) => unknown)(state) : state;
    });

    render(<BrushSizeSlider />);

    const sizeDisplay = screen.getByText('10px');
    expect(sizeDisplay).toBeInTheDocument();
  });

  it('슬라이더 값 변경 시 setBrushSize를 호출한다', async () => {
    render(<BrushSizeSlider />);

    const slider = screen.getByRole('slider', { name: /브러시 크기/i });
    fireEvent.change(slider, { target: { value: '20' } });

    expect(mockSetBrushSize).toHaveBeenCalledWith(20);
  });

  it('현재 크기 미리보기 원을 렌더링한다', async () => {
    const { useCanvasStore } = await import('@/stores/canvasStore');
    vi.mocked(useCanvasStore).mockImplementation((selector: unknown) => {
      const state = {
        brush: { color: '#FF0000', size: 15, opacity: 1 },
        setBrushSize: mockSetBrushSize,
      };
      return typeof selector === 'function' ? (selector as (s: typeof state) => unknown)(state) : state;
    });

    render(<BrushSizeSlider />);

    const preview = screen.getByTestId('brush-preview');
    expect(preview).toBeInTheDocument();
    // 크기가 반영되어야 함
    expect(preview).toHaveStyle({ width: '15px', height: '15px' });
  });

  it('미리보기 원에 현재 색상이 적용된다', async () => {
    const { useCanvasStore } = await import('@/stores/canvasStore');
    vi.mocked(useCanvasStore).mockImplementation((selector: unknown) => {
      const state = {
        brush: { color: '#FF0000', size: 15, opacity: 1 },
        setBrushSize: mockSetBrushSize,
      };
      return typeof selector === 'function' ? (selector as (s: typeof state) => unknown)(state) : state;
    });

    render(<BrushSizeSlider />);

    const preview = screen.getByTestId('brush-preview');
    expect(preview).toHaveStyle({ backgroundColor: '#FF0000' });
  });

  it('슬라이더의 초기값이 현재 브러시 크기와 일치한다', async () => {
    const { useCanvasStore } = await import('@/stores/canvasStore');
    vi.mocked(useCanvasStore).mockImplementation((selector: unknown) => {
      const state = {
        brush: { color: '#000000', size: 25, opacity: 1 },
        setBrushSize: mockSetBrushSize,
      };
      return typeof selector === 'function' ? (selector as (s: typeof state) => unknown)(state) : state;
    });

    render(<BrushSizeSlider />);

    const slider = screen.getByRole('slider', { name: /브러시 크기/i });
    expect(slider).toHaveValue('25');
  });

  it('레이블이 표시된다', () => {
    render(<BrushSizeSlider />);

    const label = screen.getByText(/브러시 크기/i);
    expect(label).toBeInTheDocument();
  });
});
