import { describe, it, expect, beforeEach } from 'vitest'
import {
  floodFill,
  parseColor,
  colorToRgba,
  colorsMatch,
  createImageDataMock,
  type RgbaColor
} from './floodFill'

describe('floodFill', () => {
  describe('parseColor', () => {
    it('hex 색상을 RGBA로 파싱한다', () => {
      const result = parseColor('#FF0000')
      expect(result).toEqual({ r: 255, g: 0, b: 0, a: 255 })
    })

    it('3자리 hex 색상을 파싱한다', () => {
      const result = parseColor('#F00')
      expect(result).toEqual({ r: 255, g: 0, b: 0, a: 255 })
    })

    it('rgb 색상을 파싱한다', () => {
      const result = parseColor('rgb(0, 255, 0)')
      expect(result).toEqual({ r: 0, g: 255, b: 0, a: 255 })
    })

    it('rgba 색상을 파싱한다', () => {
      const result = parseColor('rgba(0, 0, 255, 0.5)')
      expect(result).toEqual({ r: 0, g: 0, b: 255, a: 128 })
    })

    it('잘못된 색상에 대해 null을 반환한다', () => {
      const result = parseColor('invalid')
      expect(result).toBeNull()
    })

    it('빈 문자열에 대해 null을 반환한다', () => {
      const result = parseColor('')
      expect(result).toBeNull()
    })
  })

  describe('colorToRgba', () => {
    it('RgbaColor를 배열로 변환한다', () => {
      const color: RgbaColor = { r: 255, g: 128, b: 64, a: 255 }
      const result = colorToRgba(color)
      expect(result).toEqual([255, 128, 64, 255])
    })
  })

  describe('colorsMatch', () => {
    it('동일한 색상은 true를 반환한다', () => {
      const color1: RgbaColor = { r: 255, g: 0, b: 0, a: 255 }
      const color2: RgbaColor = { r: 255, g: 0, b: 0, a: 255 }
      expect(colorsMatch(color1, color2)).toBe(true)
    })

    it('다른 색상은 false를 반환한다', () => {
      const color1: RgbaColor = { r: 255, g: 0, b: 0, a: 255 }
      const color2: RgbaColor = { r: 0, g: 255, b: 0, a: 255 }
      expect(colorsMatch(color1, color2)).toBe(false)
    })

    it('tolerance 범위 내의 색상은 true를 반환한다', () => {
      const color1: RgbaColor = { r: 255, g: 0, b: 0, a: 255 }
      const color2: RgbaColor = { r: 250, g: 5, b: 5, a: 255 }
      expect(colorsMatch(color1, color2, 10)).toBe(true)
    })

    it('tolerance 범위 밖의 색상은 false를 반환한다', () => {
      const color1: RgbaColor = { r: 255, g: 0, b: 0, a: 255 }
      const color2: RgbaColor = { r: 240, g: 15, b: 15, a: 255 }
      expect(colorsMatch(color1, color2, 10)).toBe(false)
    })
  })

  describe('createImageDataMock', () => {
    it('지정된 크기의 ImageData를 생성한다', () => {
      const imageData = createImageDataMock(10, 10)
      expect(imageData.width).toBe(10)
      expect(imageData.height).toBe(10)
      expect(imageData.data.length).toBe(10 * 10 * 4)
    })

    it('기본 색상으로 채워진 ImageData를 생성한다', () => {
      const fillColor: RgbaColor = { r: 255, g: 0, b: 0, a: 255 }
      const imageData = createImageDataMock(2, 2, fillColor)

      // 첫 번째 픽셀 확인
      expect(imageData.data[0]).toBe(255) // R
      expect(imageData.data[1]).toBe(0)   // G
      expect(imageData.data[2]).toBe(0)   // B
      expect(imageData.data[3]).toBe(255) // A
    })
  })

  describe('floodFill algorithm', () => {
    it('단색 영역을 새 색상으로 채운다', () => {
      // 5x5 흰색 캔버스 생성
      const white: RgbaColor = { r: 255, g: 255, b: 255, a: 255 }
      const imageData = createImageDataMock(5, 5, white)

      // 빨간색으로 채우기
      const fillColor: RgbaColor = { r: 255, g: 0, b: 0, a: 255 }
      const result = floodFill(imageData, 2, 2, fillColor)

      // 모든 픽셀이 빨간색인지 확인
      for (let i = 0; i < result.data.length; i += 4) {
        expect(result.data[i]).toBe(255)     // R
        expect(result.data[i + 1]).toBe(0)   // G
        expect(result.data[i + 2]).toBe(0)   // B
        expect(result.data[i + 3]).toBe(255) // A
      }
    })

    it('경계가 있는 영역만 채운다', () => {
      // 5x5 흰색 캔버스
      const white: RgbaColor = { r: 255, g: 255, b: 255, a: 255 }
      const black: RgbaColor = { r: 0, g: 0, b: 0, a: 255 }
      const imageData = createImageDataMock(5, 5, white)

      // 가운데 가로줄을 검은색으로 (y=2)
      for (let x = 0; x < 5; x++) {
        const idx = (2 * 5 + x) * 4
        imageData.data[idx] = 0
        imageData.data[idx + 1] = 0
        imageData.data[idx + 2] = 0
        imageData.data[idx + 3] = 255
      }

      // 위쪽 영역만 빨간색으로 채우기 (y=0에서 시작)
      const fillColor: RgbaColor = { r: 255, g: 0, b: 0, a: 255 }
      const result = floodFill(imageData, 2, 0, fillColor)

      // 위쪽 영역 (y=0, y=1)은 빨간색
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 5; x++) {
          const idx = (y * 5 + x) * 4
          expect(result.data[idx]).toBe(255)     // R
          expect(result.data[idx + 1]).toBe(0)   // G
          expect(result.data[idx + 2]).toBe(0)   // B
        }
      }

      // 경계선 (y=2)은 검은색 유지
      for (let x = 0; x < 5; x++) {
        const idx = (2 * 5 + x) * 4
        expect(result.data[idx]).toBe(0)     // R
        expect(result.data[idx + 1]).toBe(0) // G
        expect(result.data[idx + 2]).toBe(0) // B
      }

      // 아래쪽 영역 (y=3, y=4)은 흰색 유지
      for (let y = 3; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const idx = (y * 5 + x) * 4
          expect(result.data[idx]).toBe(255)     // R
          expect(result.data[idx + 1]).toBe(255) // G
          expect(result.data[idx + 2]).toBe(255) // B
        }
      }
    })

    it('같은 색상으로 채우면 변경되지 않는다', () => {
      const white: RgbaColor = { r: 255, g: 255, b: 255, a: 255 }
      const imageData = createImageDataMock(3, 3, white)
      const originalData = new Uint8ClampedArray(imageData.data)

      const result = floodFill(imageData, 1, 1, white)

      expect(result.data).toEqual(originalData)
    })

    it('캔버스 경계를 벗어나지 않는다', () => {
      const white: RgbaColor = { r: 255, g: 255, b: 255, a: 255 }
      const imageData = createImageDataMock(3, 3, white)

      const fillColor: RgbaColor = { r: 255, g: 0, b: 0, a: 255 }

      // 경계에서 시작해도 오류 없이 동작
      expect(() => floodFill(imageData, 0, 0, fillColor)).not.toThrow()
      expect(() => floodFill(imageData, 2, 2, fillColor)).not.toThrow()
    })

    it('범위 밖 좌표는 원본을 반환한다', () => {
      const white: RgbaColor = { r: 255, g: 255, b: 255, a: 255 }
      const imageData = createImageDataMock(3, 3, white)
      const originalData = new Uint8ClampedArray(imageData.data)

      const fillColor: RgbaColor = { r: 255, g: 0, b: 0, a: 255 }

      const result = floodFill(imageData, -1, 0, fillColor)
      expect(result.data).toEqual(originalData)

      const result2 = floodFill(imageData, 0, 10, fillColor)
      expect(result2.data).toEqual(originalData)
    })

    it('tolerance를 사용하여 유사한 색상도 채운다', () => {
      // 3x3 캔버스, 중앙은 약간 다른 색상
      const white: RgbaColor = { r: 255, g: 255, b: 255, a: 255 }
      const nearWhite: RgbaColor = { r: 250, g: 250, b: 250, a: 255 }
      const imageData = createImageDataMock(3, 3, white)

      // 중앙 픽셀을 nearWhite로 설정
      const centerIdx = (1 * 3 + 1) * 4
      imageData.data[centerIdx] = 250
      imageData.data[centerIdx + 1] = 250
      imageData.data[centerIdx + 2] = 250

      // tolerance 10으로 채우기 - 중앙도 채워져야 함
      const fillColor: RgbaColor = { r: 255, g: 0, b: 0, a: 255 }
      const result = floodFill(imageData, 0, 0, fillColor, 10)

      // 모든 픽셀이 빨간색
      for (let i = 0; i < result.data.length; i += 4) {
        expect(result.data[i]).toBe(255)     // R
        expect(result.data[i + 1]).toBe(0)   // G
        expect(result.data[i + 2]).toBe(0)   // B
      }
    })

    it('L자 모양 영역을 올바르게 채운다', () => {
      // 5x5 캔버스에 L자 모양 흰색 영역
      const black: RgbaColor = { r: 0, g: 0, b: 0, a: 255 }
      const white: RgbaColor = { r: 255, g: 255, b: 255, a: 255 }
      const imageData = createImageDataMock(5, 5, black)

      // L자 모양 흰색 영역 설정
      // X X X . .
      // X . . . .
      // X . . . .
      // X . . . .
      // X X X X X
      const lShape = [
        [0,0], [1,0], [2,0],
        [0,1],
        [0,2],
        [0,3],
        [0,4], [1,4], [2,4], [3,4], [4,4]
      ]

      for (const [x, y] of lShape) {
        const idx = (y * 5 + x) * 4
        imageData.data[idx] = 255
        imageData.data[idx + 1] = 255
        imageData.data[idx + 2] = 255
        imageData.data[idx + 3] = 255
      }

      // L자 모양을 빨간색으로 채우기
      const fillColor: RgbaColor = { r: 255, g: 0, b: 0, a: 255 }
      const result = floodFill(imageData, 0, 0, fillColor)

      // L자 영역은 빨간색
      for (const [x, y] of lShape) {
        const idx = (y * 5 + x) * 4
        expect(result.data[idx]).toBe(255)     // R
        expect(result.data[idx + 1]).toBe(0)   // G
        expect(result.data[idx + 2]).toBe(0)   // B
      }

      // 나머지 영역은 검은색 유지
      const notLShape = [
        [3,0], [4,0],
        [1,1], [2,1], [3,1], [4,1],
        [1,2], [2,2], [3,2], [4,2],
        [1,3], [2,3], [3,3], [4,3]
      ]

      for (const [x, y] of notLShape) {
        const idx = (y * 5 + x) * 4
        expect(result.data[idx]).toBe(0)     // R
        expect(result.data[idx + 1]).toBe(0) // G
        expect(result.data[idx + 2]).toBe(0) // B
      }
    })

    it('큰 영역에서도 스택 오버플로우 없이 동작한다', () => {
      // 100x100 캔버스
      const white: RgbaColor = { r: 255, g: 255, b: 255, a: 255 }
      const imageData = createImageDataMock(100, 100, white)

      const fillColor: RgbaColor = { r: 255, g: 0, b: 0, a: 255 }

      expect(() => floodFill(imageData, 50, 50, fillColor)).not.toThrow()

      const result = floodFill(imageData, 50, 50, fillColor)

      // 샘플 픽셀 확인
      expect(result.data[0]).toBe(255)   // 첫 픽셀 R
      expect(result.data[1]).toBe(0)     // 첫 픽셀 G
    })
  })
})
