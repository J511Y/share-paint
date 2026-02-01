# 캔버스 드로잉 툴 구현 계획

## 개요

PaintShare의 핵심 기능인 HTML5 Canvas 기반 드로잉 툴 구현 계획입니다.

## 요구사항

1. HTML5 Canvas 기반 드로잉
2. 기본 도구: 펜, 지우개, 채우기
3. 색상 선택기
4. 브러시 크기 조절
5. Undo/Redo 기능
6. 캔버스 초기화
7. 모바일 터치 지원
8. PNG 내보내기

---

## Phase 1: 핵심 유틸리티 ✅ 완료

**커밋**: `348bad4`

### 구현된 파일

| 파일 | 설명 | 커버리지 |
|------|------|----------|
| `src/lib/canvas/floodFill.ts` | Flood Fill 알고리즘 | 86% |
| `src/lib/canvas/index.ts` | 배럴 export | - |
| `src/hooks/useCanvas.ts` | fill() 함수 추가 | - |
| `vitest.config.ts` | Vitest 설정 | - |
| `vitest.setup.ts` | 테스트 setup | - |

### 테스트 파일

| 파일 | 테스트 수 |
|------|----------|
| `src/lib/canvas/floodFill.test.ts` | 21개 |
| `src/stores/canvasStore.test.ts` | 28개 (100% 커버리지) |
| `src/hooks/useCanvas.test.ts` | 14개 |

### Flood Fill 알고리즘 특징
- 스택 기반 Scanline 알고리즘 (재귀 대신 반복)
- Tolerance 지원 (유사 색상 채우기)
- 방문 비트맵으로 성능 최적화
- 캔버스 경계 안전 처리

---

## Phase 2: UI 컴포넌트 ✅ 완료

### 구현된 파일

| 파일 | 설명 | 커버리지 |
|------|------|----------|
| `src/components/canvas/Canvas.tsx` | 캔버스 렌더링 및 이벤트 바인딩 | 90%+ |
| `src/components/canvas/CanvasToolbar.tsx` | 펜, 지우개, 채우기 도구 버튼 | 100% |
| `src/components/canvas/ColorPicker.tsx` | 12색 프리셋 + 커스텀 색상 | 100% |
| `src/components/canvas/BrushSizeSlider.tsx` | 브러시 크기 조절 (1-50px) | 100% |
| `src/components/canvas/CanvasActions.tsx` | Undo, Redo, Clear, Export 버튼 | 100% |
| `src/components/canvas/index.ts` | 배럴 export | - |

### 테스트 파일

| 파일 | 테스트 수 |
|------|----------|
| `Canvas.test.tsx` | 14개 |
| `CanvasToolbar.test.tsx` | 8개 |
| `ColorPicker.test.tsx` | 7개 |
| `BrushSizeSlider.test.tsx` | 9개 |
| `CanvasActions.test.tsx` | 12개 |

**총 50개 테스트, 113개 전체 테스트 모두 통과**

### 주요 기능

- **Canvas.tsx**: forwardRef 지원, 마우스/터치 이벤트 통합, fill 도구 클릭 처리
- **CanvasToolbar.tsx**: lucide-react 아이콘, 선택 상태 하이라이트, 가로/세로 레이아웃
- **ColorPicker.tsx**: 12가지 프리셋 색상, 커스텀 색상 input, 현재 색상 표시
- **BrushSizeSlider.tsx**: range input, 크기 미리보기 원, 실시간 업데이트
- **CanvasActions.tsx**: 비활성화 상태 처리, lucide-react 아이콘, Button 컴포넌트 재사용

---

## Phase 3: 페이지 통합 ⏳ 대기

### 3.1 드로잉 페이지
**경로**: `src/app/(main)/draw/page.tsx`

```typescript
export const metadata = {
  title: '그림 그리기 | PaintShare',
};
```

### 3.2 DrawingCanvas 통합 컴포넌트
**경로**: `src/app/(main)/draw/DrawingCanvas.tsx`

```typescript
'use client';

// 모든 캔버스 컴포넌트 조합
// 레이아웃: 사이드바(도구/색상) + 메인(캔버스)
```

---

## Phase 4: 반응형 & 터치 최적화 ⏳ 대기

### 4.1 useResponsiveCanvas 훅
**경로**: `src/hooks/useResponsiveCanvas.ts`

```typescript
export function useResponsiveCanvas() {
  // 데스크톱: 800x600
  // 모바일: 360x480
  // resize 이벤트 debounce
}
```

### 4.2 터치 최적화
- `touch-action: none` CSS
- `passive: false` 이벤트 리스너
- 멀티터치 방지
- 스크롤 방지

---

## 위험 요소 및 완화

| 위험 | 수준 | 완화 방안 |
|------|------|-----------|
| Flood-Fill 성능 | 중 | 스택 기반 알고리즘 ✅ |
| 모바일 터치 호환성 | 중 | touch-action CSS |
| 히스토리 메모리 | 낮 | 50개 제한 설정됨 |
| 브라우저 호환성 | 낮 | 주요 브라우저 테스트 |

---

## 성공 기준

- [ ] 펜 도구로 부드러운 선 그리기
- [ ] 지우개로 삭제
- [ ] 채우기 도구로 영역 채우기
- [ ] 12색 + 커스텀 색상 선택
- [ ] 브러시 크기 조절 (1-50px)
- [ ] Undo/Redo 동작
- [ ] 캔버스 초기화
- [ ] 모바일 터치 지원
- [ ] PNG 다운로드
- [ ] 80%+ 테스트 커버리지

---

## 다음 세션 시작 시

1. 이 문서 확인
2. Phase 2부터 TDD로 진행
3. `/tdd` 커맨드 사용
4. Phase 완료 후 커밋
5. `plan/progress.md` 업데이트
