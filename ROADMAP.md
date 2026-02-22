# PaintShare Launch Roadmap

## 목적 및 운영 원칙

- **목적**: 제품 출시까지의 단일 진실 소스(SSOT)
- **운영 원칙**: 기능 추가/버그 수정/문서 변경 시 `ROADMAP.md` 갱신 필수

## 0. 현재 기준선(Baseline)

### 현재 완료 상태 요약
- **캔버스/드로잉**: 기본 드로잉 툴(펜/지우개/색상/브러시), 타이머, 저장 모달, 반응형 캔버스 흐름이 구현됨
- **SNS**: 피드, 그림 업로드/저장, 좋아요, 댓글, 팔로우, 프로필/갤러리 기능이 구현됨
- **배틀/실시간**: 대결방 생성/참가, 타이머 동기화, 실시간 채팅/이모티콘, 캔버스 스트리밍, 투표/순위까지 주요 기능 완료
- **랜덤 주제**: 랜덤 주제 API 및 시딩, 드로잉/배틀 연계가 구현됨

### 기준선 근거 문서
- `plan/progress.md`
- `AGENTS.md`

### 코드 위치 맵
- **드로잉**: `src/app/(main)/draw`, `src/components/canvas`, `src/hooks/useCanvas.ts`
- **피드/SNS**: `src/app/(main)/feed`, `src/app/api/paintings`, `src/hooks/useLike.ts`, `src/hooks/useFollow.ts`
- **배틀/실시간**: `src/app/(main)/battle`, `src/components/battle`, `src/hooks/useBattle.ts`, `socket-server/server.js`
- **DB/스키마**: `supabase/migrations/*.sql`

## 1. Release Gate (출시 필수 조건)

- [ ] **기능 완성도**
  - [ ] 로그인 → 드로잉 → 저장 → 피드 게시/조회 → 좋아요/댓글 → 배틀 진입/종료 전 구간 정상 동작
  - [ ] 랜덤 주제/타이머/저장 실패 시 사용자 복구 플로우 제공
- [ ] **안정성**
  - [ ] 배틀 세션 중 이탈/재접속/중복 접속 시 상태 일관성 보장
  - [ ] 주요 API 오류 코드/메시지 표준화 및 재시도 정책 적용
- [ ] **보안**
  - [ ] Supabase RLS, API 입력 검증, 권한 검증 재점검
  - [ ] 환경 변수 및 서비스 키 노출 방지 점검
- [ ] **관측성(Observability)**
  - [ ] API/Socket 에러 로깅, 요청 추적 ID, 핵심 지표 대시보드 구축
  - [ ] 알림 규칙(5xx 급증, 소켓 오류율 급증, 저장 실패율 상승) 설정
- [ ] **운영 준비**
  - [ ] 배포 체크리스트/런북/롤백 절차 문서화
  - [ ] 장애 대응 연락 체계 및 온콜 역할 정의

## 2. Phase A - 안정화 (1~2주)

### 목표
모바일/실시간 안정성 및 API 오류 처리 품질을 출시 가능한 수준으로 끌어올린다.

### 주요 작업
- [ ] **모바일 최적화** (`src/app/(main)/draw`, `src/components/canvas`)
  - [ ] 터치 입력 정확도 및 지연 시간 개선
  - [ ] 저사양 디바이스 렌더링/메모리 사용량 튜닝
- [ ] **battle 안정성 강화** (`src/app/(main)/battle`, `src/components/battle`, `src/hooks/useBattle.ts`, `socket-server/server.js`)
  - [ ] 재연결/복구 로직 강화 (방 상태, 타이머, 투표 상태)
  - [ ] 방장 이탈, 네트워크 단절, 동시 이벤트 경합 시나리오 대응
- [ ] **API 에러 처리 표준화** (`src/app/api/**`, `src/lib/api-handler.ts`)
  - [ ] 에러 응답 포맷 통일(code/message/details)
  - [ ] 클라이언트 훅(`src/hooks/useLike.ts`, `src/hooks/useFollow.ts` 등) 사용자 메시지 정책 통일

## 3. Phase B - 품질 보증 (1주)

### 핵심 경로 테스트
- [ ] 시나리오: 로그인 → 드로잉 → 저장 → 피드 → 좋아요/댓글 → 배틀
- [ ] 커버리지 대상
  - [ ] `src/app/(auth)/*`
  - [ ] `src/app/(main)/draw/*`, `src/components/canvas/*`
  - [ ] `src/app/(main)/feed/*`, `src/app/api/paintings/*`, `src/hooks/useLike.ts`
  - [ ] `src/app/(main)/battle/*`, `src/hooks/useBattle.ts`, `socket-server/server.js`

### 성능 예산 정의
- [ ] Web 성능
  - [ ] **LCP**: <= 2.5s (p75)
  - [ ] **TTI**: <= 3.5s (p75)
- [ ] API 성능
  - [ ] 핵심 API **p95 <= 400ms** (`/api/paintings`, `/api/topics/random`, `/api/battle/*`)
- [ ] 실시간
  - [ ] 배틀 이벤트 전달 지연 p95 <= 300ms

## 4. Phase C - 런치 준비 (1주)

- [ ] **환경 분리 확정 (dev/staging/prod)**
  - [ ] Supabase 프로젝트/키/스토리지 버킷 분리
  - [ ] Vercel 프로젝트/환경 변수 분리
- [ ] **마이그레이션 리허설** (`supabase/migrations/*.sql`)
  - [ ] staging 리허설 및 롤포워드/롤백 검증
  - [ ] 데이터 백업/복원 리허설
- [ ] **릴리즈/롤백 절차**
  - [ ] 배포 단계별 검증 체크리스트
  - [ ] 문제 발생 시 즉시 롤백 기준/담당자/커뮤니케이션 채널 명시

## 5. Phase D - 소프트 런치 & GA

### 소프트 런치
- [ ] 제한된 사용자 그룹 대상 공개
- [ ] 핵심 지표 추적
  - [ ] 회원가입 전환율
  - [ ] 드로잉 저장 성공률
  - [ ] 배틀 완주율
  - [ ] 에러율(HTTP 5xx, 소켓 오류)
- [ ] 알림 임계치
  - [ ] 저장 실패율 > 2%
  - [ ] API 5xx > 1%
  - [ ] 배틀 중도 이탈률 > 25%

### GA(정식 출시) 승격 기준
- [ ] 7일 연속 중대한 장애(Sev1/Sev2) 없음
- [ ] 핵심 경로 성공률 98% 이상
- [ ] 성능 예산(LCP/TTI/API p95) 충족
- [ ] 운영 런북 및 온콜 대응 리허설 완료

## 6. Workstream별 TODO

### Frontend
- [ ] draw/feed/battle 페이지 모바일 UX 정리 (`src/app/(main)/draw`, `src/app/(main)/feed`, `src/app/(main)/battle`)
- [ ] 공통 에러/로딩 상태 컴포넌트 정비 (`src/components/ui`)
- [ ] 캔버스 상호작용 접근성/터치 개선 (`src/components/canvas`)

### Backend/API
- [ ] API 응답/에러 스키마 통일 (`src/app/api/**`, `src/lib/api-handler.ts`)
- [ ] 인증/권한/입력 검증 강화 (`src/app/api/users/**`, `src/app/api/paintings/**`, `src/app/api/battle/**`)
- [ ] 핵심 API 성능 모니터링 지표 추가

### Realtime(Socket)
- [ ] 재연결 및 상태 복구 로직 보강 (`socket-server/server.js`, `src/hooks/useBattle.ts`)
- [ ] 이벤트 ACK/타임아웃/중복 처리 정책 정의
  - [x] PAI-33 1차: 소켓 메트릭 표준 헬퍼 추가 (`src/lib/socket/metrics.ts`) 및 임계치 단위 테스트 작성
- [ ] 배틀 단계 전이(waiting/in_progress/finished) 검증 자동화

### DB/Supabase
- [ ] 마이그레이션 정합성 점검 (`supabase/migrations/*.sql`)
- [ ] 인덱스/RLS/스토리지 정책 재점검
  - [x] PAI-30 1차: RLS/Storage 감사 체크리스트 템플릿 추가 (`docs/security/rls-storage-audit-checklist.md`, `scripts/generate-rls-storage-audit-checklist.mjs`)
- [ ] 운영 데이터 백업/복구 주기 확정

### QA
- [ ] E2E 핵심 시나리오 자동화(로그인→드로잉→저장→피드→좋아요/댓글→배틀)
- [ ] 회귀 테스트 체크리스트 운영
- [ ] 릴리즈 전 수동 점검 시트 유지

### DevOps
- [ ] dev/staging/prod CI/CD 파이프라인 정리
- [ ] 로그/메트릭/알림 대시보드 구성
- [ ] 배포 및 롤백 런북 확정

## 7. 리스크/의존성

- [ ] **모바일 캔버스 성능**: 저사양 기기에서 프레임 저하/입력 지연 가능성
- [ ] **소켓 재연결 복잡도**: 네트워크 흔들림 시 상태 드리프트 위험
- [ ] **스토리지 비용**: 이미지 업로드 증가에 따른 Supabase Storage 비용 상승
- [ ] **관측성 미흡**: 장애 조기 감지 실패 시 MTTR 증가
- [ ] **마이그레이션 리스크**: 운영 데이터와 스키마 변경 충돌 가능성

## 8. 운영 규칙

- **주간 업데이트 방식**
  - 매주 금요일 기준으로 각 Workstream 상태를 갱신
  - 변경 사항은 `plan/progress.md`와 `ROADMAP.md`를 반드시 동기화
- **담당자 표기**
  - 각 TODO 항목에 담당자(Owner) 1인 명시
  - Block 발생 시 의존 팀/해결 예정일 함께 기록
- **상태값 표준**
  - `todo` / `in-progress` / `block` / `done`
- **PR 규칙**
  - 모든 PR 설명에 ROADMAP 섹션 및 상태 변경 내역을 명시

---

### 팀 공지 템플릿

```md
[ROADMAP 운영 공지]
- 새 작업 시작 전 ROADMAP 섹션/상태 먼저 업데이트
- 작업 종료 후 ROADMAP + plan/progress.md 동기화
- PR 본문에 "어느 ROADMAP 항목을 진행/완료했는지" 반드시 기재
```
