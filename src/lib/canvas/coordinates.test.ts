import { describe, expect, it } from 'vitest';
import { getCanvasCoordinates } from './coordinates';

const createCanvas = () => {
  const canvas = {
    width: 800,
    height: 600,
    getBoundingClientRect: () => ({
      left: 100,
      top: 50,
      width: 400,
      height: 300,
    }),
  } as HTMLCanvasElement;

  return canvas;
};

describe('getCanvasCoordinates', () => {
  it('converts mouse coordinates into canvas space', () => {
    const canvas = createCanvas();
    const event = {
      clientX: 300,
      clientY: 200,
    } as MouseEvent;

    const point = getCanvasCoordinates(event, canvas);

    expect(point).toEqual({ x: 400, y: 300 });
  });

  it('uses changedTouches when touches is empty (touchend case)', () => {
    const canvas = createCanvas();
    const event = {
      touches: [],
      changedTouches: [{ clientX: 500, clientY: 350 }],
    } as unknown as TouchEvent;

    const point = getCanvasCoordinates(event, canvas);

    expect(point).toEqual({ x: 800, y: 600 });
  });

  it('clamps out-of-bound coordinates to canvas edges', () => {
    const canvas = createCanvas();
    const event = {
      clientX: 50,
      clientY: 20,
    } as MouseEvent;

    const point = getCanvasCoordinates(event, canvas);

    expect(point).toEqual({ x: 0, y: 0 });
  });

  it('returns null when bounding rect is invalid', () => {
    const canvas = {
      width: 800,
      height: 600,
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 0,
        height: 300,
      }),
    } as HTMLCanvasElement;

    const event = {
      clientX: 300,
      clientY: 200,
    } as MouseEvent;

    expect(getCanvasCoordinates(event, canvas)).toBeNull();
  });
});
