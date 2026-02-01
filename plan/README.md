# PaintShare 프로젝트 계획

## 프로젝트 개요

**PaintShare**는 그림 스피드런 SNS 플랫폼입니다.
- 제한된 시간 내에 주어진 주제로 그림을 그리고 SNS에서 공유
- 실시간 대결 기능으로 다른 사용자와 경쟁

## 기술 스택

| 카테고리 | 기술 |
|---------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (strict mode) |
| UI | React 19, Tailwind CSS 4 |
| State | Zustand 5 |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Testing | Vitest + React Testing Library |

## 전체 로드맵

### Phase 1: 기본 구조 (1주차) ✅
- [x] 프로젝트 초기 설정
- [x] Supabase 스키마 설계
- [x] 인증 시스템 UI
- [x] 기본 레이아웃

### Phase 2: 핵심 기능 (2-3주차) 🔄 진행 중
- [x] 캔버스 드로잉 툴 - Phase 1 (핵심 유틸리티)
- [ ] 캔버스 드로잉 툴 - Phase 2 (UI 컴포넌트)
- [ ] 캔버스 드로잉 툴 - Phase 3 (페이지 통합)
- [ ] 캔버스 드로잉 툴 - Phase 4 (반응형/터치)
- [ ] 타이머 시스템
- [ ] 랜덤 주제 생성
- [ ] 그림 저장 & 업로드

### Phase 3: SNS 기능 (4주차)
- [ ] 피드 페이지 데이터 연동
- [ ] 좋아요 & 댓글
- [ ] 프로필 페이지
- [ ] 팔로우 시스템

### Phase 4: 대결방 (5-6주차)
- [ ] WebSocket 서버 설정
- [ ] 대결방 생성/참가
- [ ] 실시간 채팅
- [ ] 캔버스 실시간 중계
- [ ] 모바일 최적화

### Phase 5: 마무리 (7주차)
- [ ] UI/UX 개선
- [ ] 성능 최적화
- [ ] 테스트 & 버그 수정
- [ ] 배포

## 폴더 구조

```
plan/
├── README.md              # 이 파일 - 전체 개요
├── progress.md            # 진행 상황 추적
├── canvas-drawing-tool.md # 캔버스 드로잉 툴 상세 계획
└── features/              # 기능별 상세 계획 (추후 추가)
```

## 다음 세션에서 이어갈 작업

1. **캔버스 드로잉 툴 Phase 2** - UI 컴포넌트 TDD 구현
   - Canvas.tsx, CanvasToolbar.tsx, ColorPicker.tsx 등
   - 상세: `plan/canvas-drawing-tool.md` 참조

## 참고 문서

- `AGENTS.md` - 프로젝트 전체 가이드
- `.claude/rules/` - 코딩 스타일 및 워크플로우 규칙
- `.reports/dead-code-analysis.md` - 코드 정리 리포트
