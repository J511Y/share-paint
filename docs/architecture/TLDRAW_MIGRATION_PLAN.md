# tldraw SDK Migration Plan (PaintShare)

## 목적

기존 커스텀 Canvas 엔진을 `tldraw` 기반으로 단계적으로 전환하되, 현재 운영 중인 저장/피드/게스트 플로우를 깨지 않고 점진적으로 마이그레이션한다.

---

## 1) 아키텍처 마이그레이션: 교체/유지 범위

### 교체(Replace)

- `/draw`의 편집 엔진
  - 기존: `Canvas.tsx + useCanvas.ts + canvasStore 히스토리`
  - 변경: `TldrawCanvasStage` + `Editor API` 기반 도구 제어
- 드로잉 도구 상태 관리(툴/색/사이즈)
  - 기존: Zustand 중심 상태 + 커스텀 포인터 이벤트
  - 변경: tldraw `setCurrentTool`, `setStyleForNextShapes`, `toImageDataUrl` 사용

### 유지(Keep)

- **Auth/Guest 모드**
  - `useActor`, guest identity/cookie 헤더 정책 그대로 유지
- **저장 API 파이프라인**
  - `SavePaintingModal` → `uploadImage(dataUrl)` → `/api/paintings` POST 유지
  - 결과적으로 DB에는 여전히 `image_url`이 저장되고 피드/상세 페이지 계약 불변
- **Feed 통합**
  - 피드는 이미지 URL 렌더링 구조(`PaintingCard`)를 그대로 사용
- **Battle 호환성**
  - 배틀 캔버스(`BattleCanvas`)는 기존 커스텀 Canvas 유지 (Phase-1 범위 제외)
  - 실시간 `canvas_update` 이벤트 포맷(data URL)도 유지

---

## 2) 호환 계층(Compatibility Layer)

### 도입 파일

- `src/lib/drawing/compatibility.ts`

### 역할

- 전환 기간에 드로잉 데이터 스냅샷을 통합 포맷으로 저장
- **레거시 파이프라인이 요구하는 PNG Data URL을 항상 추출 가능**하게 보장

### 핵심 타입

- `LegacyCanvasEnvelope`
- `TldrawEnvelope`
- `DrawingCompatEnvelope`

### 핵심 함수

- `createLegacyCanvasEnvelope(dataUrl)`
- `createTldrawEnvelope({ previewDataUrl, snapshot })`
- `extractLegacyDataUrl(input)`
- `persistDrawingCompatDraft(envelope)` / `loadDrawingCompatDraft()`

### 호환성 정책

1. 저장/피드/배틀 등 기존 경로는 **PNG Data URL**을 기준으로 계속 동작
2. 신규 tldraw 정보(snapshot)는 부가 메타로 저장/복원 가능
3. 즉, **기존 소비자(피드/API)는 변경 없이**, 편집기 엔진만 교체 가능

---

## 3) Phase-1 구현 내용 (main)

### 적용 완료

- `/draw`가 tldraw 기반 에디터 셸을 사용
  - `src/components/tldraw/TldrawCanvasStage.tsx` 추가
  - `DrawingCanvas.tsx`를 tldraw 제어 구조로 교체
- 필수 액션 보존
  - draw, erase, color, size, undo/redo, save/export
- guest-first 유지
  - 로그인 없이도 게스트로 저장 가능
- 저장/내보내기 출력은 기존과 동일한 PNG data URL
- tldraw CSS 글로벌 로드
  - `src/app/globals.css`

### 테스트 추가/갱신

- `src/app/(main)/draw/DrawingCanvas.test.tsx` (tldraw 셸 기준)
- `src/lib/drawing/compatibility.test.ts` (호환 계층 검증)

---

## 4) 단계별 후속 로드맵

### Phase-2

- tldraw snapshot을 서버 측 저장소(메타 컬럼/별도 테이블)로 영속화
- 다시 편집(Load & Resume) UX 도입

### Phase-3

- BattleCanvas에 tldraw 엔진 도입 검토
- 실시간 동기화를 data URL 방송에서 오퍼레이션/스냅샷 기반으로 전환 검토

---

## 5) 롤아웃 노트

1. 배포 전 검증
   - `/draw`에서 저장/내보내기/undo/redo 수동 QA
   - 게스트로 저장 후 `/feed`, `/painting/[id]` 렌더 확인
2. 점진 적용
   - 초기에는 `/draw`만 전환, 배틀은 기존 유지
3. 관찰 지표
   - `/api/paintings` 저장 실패율
   - 드로잉 페이지 이탈률/에러 로그

---

## 6) 롤백 노트

### 즉시 롤백 전략

- `DrawingCanvas.tsx`를 이전 커스텀 Canvas 구현으로 되돌리고 재배포
- `TldrawCanvasStage`/호환 계층은 미사용 상태로 남겨도 런타임 영향 없음

### 데이터 영향

- 저장 결과는 동일하게 `image_url` 기반이므로 롤백 시 데이터 마이그레이션 불필요
- 피드/상세/배틀 API 계약 변경이 없어 역호환 리스크 낮음
