/**
 * Flood Fill Algorithm (페인트 버킷 도구)
 *
 * 캔버스의 특정 지점에서 시작하여 연결된 동일 색상 영역을 새 색상으로 채웁니다.
 * 스택 기반 반복 알고리즘을 사용하여 스택 오버플로우를 방지합니다.
 */

export interface RgbaColor {
  r: number
  g: number
  b: number
  a: number
}

export interface ImageDataLike {
  width: number
  height: number
  data: Uint8ClampedArray
}

/**
 * 색상 문자열을 RGBA 객체로 파싱
 * @param colorString - hex (#RRGGBB, #RGB) 또는 rgb()/rgba() 형식
 * @returns RgbaColor 객체 또는 파싱 실패 시 null
 */
export function parseColor(colorString: string): RgbaColor | null {
  if (!colorString || colorString.trim() === '') {
    return null
  }

  const trimmed = colorString.trim()

  // Hex 형식: #RRGGBB 또는 #RGB
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1)

    if (hex.length === 3) {
      // #RGB -> #RRGGBB
      const r = parseInt(hex[0] + hex[0], 16)
      const g = parseInt(hex[1] + hex[1], 16)
      const b = parseInt(hex[2] + hex[2], 16)

      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return null
      }

      return { r, g, b, a: 255 }
    }

    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)

      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return null
      }

      return { r, g, b, a: 255 }
    }

    return null
  }

  // rgb() 형식
  const rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10)
    const g = parseInt(rgbMatch[2], 10)
    const b = parseInt(rgbMatch[3], 10)

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return null
    }

    return { r, g, b, a: 255 }
  }

  // rgba() 형식
  const rgbaMatch = trimmed.match(
    /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i
  )
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10)
    const g = parseInt(rgbaMatch[2], 10)
    const b = parseInt(rgbaMatch[3], 10)
    const a = Math.round(parseFloat(rgbaMatch[4]) * 255)

    if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
      return null
    }

    return { r, g, b, a }
  }

  return null
}

/**
 * RgbaColor 객체를 배열로 변환
 */
export function colorToRgba(color: RgbaColor): [number, number, number, number] {
  return [color.r, color.g, color.b, color.a]
}

/**
 * 두 색상이 tolerance 범위 내에서 일치하는지 확인
 * @param color1 - 첫 번째 색상
 * @param color2 - 두 번째 색상
 * @param tolerance - 허용 오차 (0-255, 기본값 0)
 * @returns 색상이 일치하면 true
 */
export function colorsMatch(
  color1: RgbaColor,
  color2: RgbaColor,
  tolerance: number = 0
): boolean {
  return (
    Math.abs(color1.r - color2.r) <= tolerance &&
    Math.abs(color1.g - color2.g) <= tolerance &&
    Math.abs(color1.b - color2.b) <= tolerance &&
    Math.abs(color1.a - color2.a) <= tolerance
  )
}

/**
 * 테스트용 ImageData 모킹 생성
 * @param width - 너비
 * @param height - 높이
 * @param fillColor - 채울 색상 (기본값: 투명)
 * @returns ImageDataLike 객체
 */
export function createImageDataMock(
  width: number,
  height: number,
  fillColor?: RgbaColor
): ImageDataLike {
  const data = new Uint8ClampedArray(width * height * 4)

  if (fillColor) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fillColor.r
      data[i + 1] = fillColor.g
      data[i + 2] = fillColor.b
      data[i + 3] = fillColor.a
    }
  }

  return {
    width,
    height,
    data,
  }
}

/**
 * 지정된 위치의 픽셀 색상을 가져옴
 */
function getPixelColor(
  imageData: ImageDataLike,
  x: number,
  y: number
): RgbaColor {
  const idx = (y * imageData.width + x) * 4
  return {
    r: imageData.data[idx],
    g: imageData.data[idx + 1],
    b: imageData.data[idx + 2],
    a: imageData.data[idx + 3],
  }
}

/**
 * 지정된 위치에 픽셀 색상을 설정
 */
function setPixelColor(
  imageData: ImageDataLike,
  x: number,
  y: number,
  color: RgbaColor
): void {
  const idx = (y * imageData.width + x) * 4
  imageData.data[idx] = color.r
  imageData.data[idx + 1] = color.g
  imageData.data[idx + 2] = color.b
  imageData.data[idx + 3] = color.a
}

/**
 * Flood Fill 알고리즘
 *
 * 지정된 시작점에서 연결된 동일 색상 영역을 새 색상으로 채웁니다.
 * 스택 기반 반복 알고리즘 (Scanline Flood Fill)을 사용합니다.
 *
 * @param imageData - 캔버스 이미지 데이터
 * @param startX - 시작 X 좌표
 * @param startY - 시작 Y 좌표
 * @param fillColor - 채울 색상
 * @param tolerance - 색상 허용 오차 (0-255, 기본값 0)
 * @returns 수정된 ImageData
 */
export function floodFill(
  imageData: ImageDataLike,
  startX: number,
  startY: number,
  fillColor: RgbaColor,
  tolerance: number = 0
): ImageDataLike {
  const { width, height } = imageData

  // 범위 검사
  if (
    startX < 0 ||
    startX >= width ||
    startY < 0 ||
    startY >= height
  ) {
    return imageData
  }

  // 시작점 색상 가져오기
  const targetColor = getPixelColor(imageData, startX, startY)

  // 시작점과 채우려는 색상이 같으면 아무것도 하지 않음
  if (colorsMatch(targetColor, fillColor, 0)) {
    return imageData
  }

  // 방문 여부 추적 (비트맵으로 메모리 효율화)
  const visited = new Uint8Array(width * height)

  // 스택 기반 Scanline Flood Fill
  const stack: [number, number][] = [[startX, startY]]

  while (stack.length > 0) {
    const [x, y] = stack.pop()!
    const visitIdx = y * width + x

    // 이미 방문했거나 범위 밖이면 스킵
    if (
      x < 0 ||
      x >= width ||
      y < 0 ||
      y >= height ||
      visited[visitIdx]
    ) {
      continue
    }

    // 현재 픽셀 색상 확인
    const currentColor = getPixelColor(imageData, x, y)
    if (!colorsMatch(currentColor, targetColor, tolerance)) {
      continue
    }

    // 방문 표시 및 색상 채우기
    visited[visitIdx] = 1
    setPixelColor(imageData, x, y, fillColor)

    // Scanline 방식: 현재 라인에서 왼쪽으로 확장
    let leftX = x - 1
    while (leftX >= 0 && !visited[y * width + leftX]) {
      const leftColor = getPixelColor(imageData, leftX, y)
      if (!colorsMatch(leftColor, targetColor, tolerance)) {
        break
      }
      visited[y * width + leftX] = 1
      setPixelColor(imageData, leftX, y, fillColor)
      leftX--
    }
    leftX++ // 마지막으로 채운 픽셀의 x 좌표

    // 오른쪽으로 확장
    let rightX = x + 1
    while (rightX < width && !visited[y * width + rightX]) {
      const rightColor = getPixelColor(imageData, rightX, y)
      if (!colorsMatch(rightColor, targetColor, tolerance)) {
        break
      }
      visited[y * width + rightX] = 1
      setPixelColor(imageData, rightX, y, fillColor)
      rightX++
    }
    rightX-- // 마지막으로 채운 픽셀의 x 좌표

    // 위쪽과 아래쪽 라인 스캔하여 새 시작점 추가
    for (let scanX = leftX; scanX <= rightX; scanX++) {
      // 위쪽 라인
      if (y > 0 && !visited[(y - 1) * width + scanX]) {
        const aboveColor = getPixelColor(imageData, scanX, y - 1)
        if (colorsMatch(aboveColor, targetColor, tolerance)) {
          stack.push([scanX, y - 1])
        }
      }

      // 아래쪽 라인
      if (y < height - 1 && !visited[(y + 1) * width + scanX]) {
        const belowColor = getPixelColor(imageData, scanX, y + 1)
        if (colorsMatch(belowColor, targetColor, tolerance)) {
          stack.push([scanX, y + 1])
        }
      }
    }
  }

  return imageData
}

/**
 * 캔버스 컨텍스트에서 직접 Flood Fill 수행
 * @param ctx - 캔버스 2D 컨텍스트
 * @param x - 시작 X 좌표
 * @param y - 시작 Y 좌표
 * @param fillColorString - 채울 색상 문자열
 * @param tolerance - 색상 허용 오차
 */
export function floodFillCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fillColorString: string,
  tolerance: number = 0
): void {
  const fillColor = parseColor(fillColorString)
  if (!fillColor) {
    console.warn('Invalid fill color:', fillColorString)
    return
  }

  const { width, height } = ctx.canvas
  const imageData = ctx.getImageData(0, 0, width, height)

  floodFill(imageData, Math.floor(x), Math.floor(y), fillColor, tolerance)

  ctx.putImageData(imageData, 0, 0)
}
