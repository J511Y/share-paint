export interface CanvasPoint {
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const getTouchPoint = (event: TouchEvent): Touch | null => {
  return event.touches[0] ?? event.changedTouches[0] ?? null;
};

export function getCanvasCoordinates(
  event: MouseEvent | TouchEvent,
  canvas: HTMLCanvasElement
): CanvasPoint | null {
  const rect = canvas.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) {
    return null;
  }

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  if ('touches' in event) {
    const touch = getTouchPoint(event);
    if (!touch) return null;

    return {
      x: clamp((touch.clientX - rect.left) * scaleX, 0, canvas.width),
      y: clamp((touch.clientY - rect.top) * scaleY, 0, canvas.height),
    };
  }

  return {
    x: clamp((event.clientX - rect.left) * scaleX, 0, canvas.width),
    y: clamp((event.clientY - rect.top) * scaleY, 0, canvas.height),
  };
}
