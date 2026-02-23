import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrushSizeSlider } from './BrushSizeSlider';
import type { DrawingPresetId } from '@/types/canvas';

const mockSetBrushSize = vi.fn();
const mockSetBrushOpacity = vi.fn();

const mockStoreState = {
  activePreset: 'pencil' as DrawingPresetId,
  brush: { color: '#000000', size: 5, opacity: 1, style: 'pencil' as const },
  setBrushSize: mockSetBrushSize,
  setBrushOpacity: mockSetBrushOpacity,
};

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: vi.fn((selector) => {
    return typeof selector === 'function' ? selector(mockStoreState) : mockStoreState;
  }),
}));

describe('BrushSizeSlider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.activePreset = 'pencil';
    mockStoreState.brush.size = 5;
    mockStoreState.brush.color = '#000000';
    mockStoreState.brush.opacity = 1;
  });

  it('range input을 렌더링한다', () => {
    render(<BrushSizeSlider />);

    const slider = screen.getByRole('slider', { name: /브러시 크기/i });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('type', 'range');
  });

  it('최소값이 1이다', () => {
    render(<BrushSizeSlider />);

    expect(screen.getByRole('slider', { name: /브러시 크기/i })).toHaveAttribute(
      'min',
      '1'
    );
  });

  it('최대값이 80이다', () => {
    render(<BrushSizeSlider />);

    expect(screen.getByRole('slider', { name: /브러시 크기/i })).toHaveAttribute(
      'max',
      '80'
    );
  });

  it('빠른 크기 버튼을 렌더링한다', () => {
    render(<BrushSizeSlider />);

    expect(screen.getByRole('button', { name: '2px' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '26px' })).toBeInTheDocument();
  });

  it('빠른 크기 버튼 클릭 시 setBrushSize를 호출한다', async () => {
    const user = userEvent.setup();
    render(<BrushSizeSlider />);

    await user.click(screen.getByRole('button', { name: '12px' }));

    expect(mockSetBrushSize).toHaveBeenCalledWith(12);
  });

  it('슬라이더 값 변경 시 setBrushSize를 호출한다', () => {
    render(<BrushSizeSlider />);

    const slider = screen.getByRole('slider', { name: /브러시 크기/i });
    fireEvent.change(slider, { target: { value: '20' } });

    expect(mockSetBrushSize).toHaveBeenCalledWith(20);
  });

  it('미리보기 원을 렌더링하고 현재 색상을 반영한다', () => {
    mockStoreState.brush.color = '#FF0000';
    mockStoreState.brush.size = 15;

    render(<BrushSizeSlider />);

    const preview = screen.getByTestId('brush-preview');
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveStyle({ width: '15px', height: '15px', backgroundColor: '#FF0000' });
  });

  it('현재 브러시 크기를 표시한다', () => {
    mockStoreState.brush.size = 10;

    render(<BrushSizeSlider />);

    expect(screen.getByText('10px')).toBeInTheDocument();
  });

  it('농도 빠른 버튼 클릭 시 setBrushOpacity를 호출한다', async () => {
    const user = userEvent.setup();
    render(<BrushSizeSlider />);

    await user.click(screen.getByRole('button', { name: '농도 50%' }));

    expect(mockSetBrushOpacity).toHaveBeenCalledWith(0.5);
  });

  it('농도 슬라이더 값 변경 시 setBrushOpacity를 호출한다', () => {
    render(<BrushSizeSlider />);

    const opacitySlider = screen.getByRole('slider', { name: /브러시 농도/i });
    fireEvent.change(opacitySlider, { target: { value: '35' } });

    expect(mockSetBrushOpacity).toHaveBeenCalledWith(0.35);
  });

  it('형광펜 프리셋일 때 낮은 농도 퀵 프리셋을 노출한다', () => {
    mockStoreState.activePreset = 'highlighter';

    render(<BrushSizeSlider />);

    expect(screen.getByRole('button', { name: '농도 10%' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '농도 60%' })).toBeInTheDocument();
  });

  it('지우개 프리셋일 때 100% 농도만 노출한다', () => {
    mockStoreState.activePreset = 'eraser';

    render(<BrushSizeSlider />);

    expect(screen.getByRole('button', { name: '농도 100%' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '농도 50%' })).not.toBeInTheDocument();
  });
});
