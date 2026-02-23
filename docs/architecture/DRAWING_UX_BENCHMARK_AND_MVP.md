# Drawing UX Benchmark and MVP Decision (2026-02-23)

## Problem
현재 draw 화면은 **도구 패널이 캔버스보다 위에 위치**해, 모바일/작은 화면에서 그림을 그리다 도구를 바꾸려면 스크롤 왕복이 자주 발생한다.

---

## 1) Benchmark: Figma / Excalidraw / tldraw / Canva / Miro

### 공통 관찰 포인트
- 캔버스 앱은 공통적으로 **컨트롤을 스크롤 컨텍스트와 분리**한다.
- 자주 쓰는 조작(툴 선택/되돌리기)은 **항상 보이는 고정 영역**에 둔다.
- 세부 옵션(색상/스타일)은 **조건부 패널(사이드바, 드로어, 팝오버)**에 둬 캔버스 면적을 확보한다.

### 제품별 패턴 요약

| Product | Toolbar placement | Sticky/Floating 패턴 | Responsive/Mobile 패턴 | 시사점 |
|---|---|---|---|---|
| Figma | 상단 툴바 + 좌/우 패널 | 패널 축소/숨김 가능, 캔버스 공간 우선 | 필요 시 UI 최소화로 캔버스 확장 | 패널은 고정하되 접기 가능해야 함 |
| Excalidraw | 메인 툴바 + 사이드바 | `dockedSidebarBreakpoint`로 도킹 전환 | 화면폭 기준으로 사이드바 도킹/해제 | breakpoint 기반 UI 전환이 실용적 |
| tldraw | 기본 UI(툴바/메뉴/스타일패널) 제공 | UI 컴포넌트 단위 커스터마이즈 가능 | 필요한 UI만 남기는 구조 | 핵심 컨트롤 우선 노출, 상세는 선택적 노출 |
| Canva | 에디터 툴바 + 사이드 패널 | 편집 패널 열고 닫는 흐름 | 모바일은 스와이프/탭 기반으로 옵션 탐색 | 모바일에선 한 번에 다 보여주지 않음 |
| Miro | 좌측 생성툴바 + 하단 내비게이션 툴바 | 일부 툴바는 상시 노출 | 터치 환경에서 툴바 커스터마이즈 제한 존재 | 최소한의 상시 툴바는 유지되어야 함 |

### 참고 자료
- Figma Help: left sidebar / panel minimize
  - https://help.figma.com/hc/en-us/articles/360039831974-View-layers-and-pages-in-the-left-sidebar
- Excalidraw docs: `UIOptions`, `dockedSidebarBreakpoint`
  - https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/ui-options
- tldraw docs: user interface customization
  - https://tldraw.dev/docs/user-interface
- Canva Help (editor update 안내)
  - https://www.canva.com/help/glow-up-variantb/
- Miro community / toolbar behaviors
  - https://community.miro.com/ask-the-community-45/remove-bottom-toolbar-15210

> 참고: 일부 상용 서비스 도움말 문서는 자동 수집 제한이 있어, 공개 문서+공식 설명+관찰 가능한 UX 패턴을 종합했다.

---

## 2) Share-paint UI options (Desktop + Mobile)

### Option A — Desktop sticky sidebar + Mobile sticky top bar + collapsible tool sheet
- **Desktop**: 좌측 도구 패널 sticky (스크롤해도 고정), 액션도 상단 sticky
- **Mobile**: 상단에 툴/액션 고정, 색상/브러시는 토글 가능한 패널로 분리
- 장점: 구현 난이도 대비 효과 큼, 기존 컴포넌트 재사용 가능, 학습비용 낮음
- 단점: 모바일에서 패널 열면 캔버스 일부를 가릴 수 있음

### Option B — Floating bottom dock (mobile-first)
- **Desktop**: 기존과 유사 + 일부 sticky
- **Mobile**: 하단 도크에 툴/액션 집약
- 장점: 엄지 접근성 우수
- 단점: 하단 UI 겹침(안전영역/키보드/시트) 처리 복잡도 증가

### Option C — Fullscreen canvas mode + auto-hide controls
- **Desktop/Mobile**: 캔버스 중심 fullscreen, 컨트롤 자동 숨김/호출
- 장점: 최대 캔버스 면적
- 단점: MVP 범위를 넘는 상호작용 복잡도, 접근성/발견성 리스크

### 접근성 고려사항 (공통)
- 토글 버튼에 `aria-expanded`, `aria-controls` 제공
- 패널을 `role="region"` + 명확한 `aria-label`
- 키보드 focus ring 유지
- 스크린리더 기준: 상시 컨트롤(툴/액션)과 세부 컨트롤(패널)을 구분

---

## 3) Chosen MVP

**Option A 선택**

선정 이유:
1. 현재 구조를 크게 깨지 않고 스크롤 문제를 즉시 해소 가능
2. 데스크톱/모바일 모두에서 “자주 쓰는 컨트롤 상시 접근”을 달성
3. 기존 Canvas/Toolbar/ColorPicker/BrushSizeSlider/CanvasActions 컴포넌트를 재사용해 리스크 최소화

구현 요약:
- Desktop: 사이드바를 `sticky`로 고정, 액션 바도 상단 고정
- Mobile: 상단 sticky 컨트롤(툴 + 실행취소/다시실행/초기화/다운로드/저장)
- Mobile: 색상/브러시를 토글 가능한 하단 패널로 제공 (오버레이 닫기 지원)
