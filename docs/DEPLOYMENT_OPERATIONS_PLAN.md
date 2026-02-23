# PaintShare 배포/운영 계획 (Deployment & Operations Plan)

> 작성일: 2026-02-22  
> 범위: `/Users/jhyou/.openclaw/workspace/share-paint`  
> 전제: **Vercel은 이미 프론트엔드(Next.js)와 연결 완료**

---

## 0) 목표/전제

### 목표
- 변경사항을 **안전하게 배포**하고, 문제 발생 시 **빠르게 감지/복구**한다.
- Preview → Staging → Production으로 이어지는 **일관된 릴리즈 체계**를 확립한다.
- 환경변수/시크릿/백업/롤백/장애대응을 문서화하여 **운영 리스크를 낮춘다**.

### 시스템 경계
- Frontend/API: Next.js (Vercel)
- Realtime Battle: Socket.io server (`socket-server/`) — 별도 런타임(권장: Railway/Fly/Render)
- DB/Auth/Storage: Supabase
- VCS/CI: GitHub + GitHub Actions

---

## 1) 환경 전략 (Preview / Staging / Production)

## 1.1 브랜치/환경 매핑

- `feature/*` → PR 생성 시 **Preview**
- `develop` → 자동 배포 **Staging**
- `main` (+ release tag `v*`) → 수동 승인 후 **Production**

## 1.2 환경별 목적

| 환경 | 목적 | 배포 트리거 | 데이터 소스 | 도메인 예시 |
|---|---|---|---|---|
| Preview | PR 변경 검토/QA | PR open/sync | Staging Supabase(격리) | `https://share-paint-git-<branch>-<team>.vercel.app` |
| Staging | 통합 테스트/UAT | `develop` push | Staging Supabase | `https://staging.share-paint.app` |
| Production | 실사용 트래픽 | `main` release 승인 | Production Supabase | `https://share-paint.app` |

> 원칙: Preview/Staging은 반드시 Prod와 데이터 격리. Prod DB를 Preview에서 절대 사용 금지.

---

## 2) CI/CD 전략

## 2.1 파이프라인 개요

1. **PR Gate (필수 체크)**
   - lint
   - type-check
   - test (unit)
   - build (Next.js)
   - 변경영역 정책 체크(기존 `pai16-ci-gate.yml` 유지/확장)

2. **Preview Deploy (자동)**
   - PR마다 Vercel Preview 자동 배포
   - Smoke test (landing, login, draw 진입)

3. **Staging Deploy (자동)**
   - `develop` merge 시 배포
   - DB migration 적용(비파괴 migration만)
   - E2E smoke test

4. **Production Deploy (수동 승인 + 자동 실행)**
   - `main` 또는 `v*` 태그 기준
   - GitHub Environment Protection(승인 1~2인)
   - 배포 후 health check 통과 시 완료

## 2.2 GitHub Actions 권장 구성

- `.github/workflows/ci.yml`
  - on: `pull_request` (`develop`, `main`)
  - steps: install → lint → type-check → test:run → build
- `.github/workflows/deploy-staging.yml`
  - on: push `develop`
  - steps: ci 재검증 → (선택) migration → deploy staging
- `.github/workflows/deploy-production.yml`
  - on: push `main` or release tag
  - required reviewers 승인 후 deploy prod
- `.github/workflows/socket-deploy.yml`
  - socket-server 변경 감지(path filter) 시 staging/prod 각각 배포

## 2.3 배포 게이트 기준 (Go/No-Go)

- Go 조건
  - CI 100% 통과
  - migration backward-compat 확인
  - 필수 환경변수 누락 없음
  - 최근 24h P1 장애 미해결 건 없음
- No-Go 조건
  - build 불안정/테스트 flaky 반복
  - DB migration에 destructive 변경 포함(drop/rename 즉시 반영)
  - observability 공백(로그/알람 미구성)

---

## 3) 환경변수/시크릿 매트릭스

> 분류:  
> - Public: 브라우저 노출 가능 (`NEXT_PUBLIC_*`)  
> - Secret: 서버/CI/소켓 런타임 전용

| 키 | 분류 | Preview | Staging | Production | 저장 위치 |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | ✅ | ✅ | ✅ | Vercel env |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | ✅ | ✅ | ✅ | Vercel env |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | 필요 시 최소권한 | ✅ | ✅ | Vercel(Server only), Socket host |
| `SUPABASE_URL` | Secret/Config | ✅ | ✅ | ✅ | Socket host env |
| `NEXT_PUBLIC_APP_URL` | Public | Preview URL | staging URL | prod URL | Vercel env |
| `NEXT_PUBLIC_SOCKET_URL` | Public | socket-stg URL | socket-stg URL | socket-prod URL | Vercel env |
| `CLIENT_URL` (socket CORS) | Config | preview/staging domain 허용 | staging domain | prod domain | Socket host env |
| `BATTLE_PASSWORD_PEPPER` | Secret | ✅ | ✅ | ✅ | Vercel/Socket secret |
| `SENTRY_DSN` | Secret | 옵션 | ✅ | ✅ | Vercel/Socket secret |
| `NEXT_PUBLIC_SENTRY_DSN` | Public | 옵션 | ✅ | ✅ | Vercel env |
| `SLACK_WEBHOOK_URL` 또는 PagerDuty 키 | Secret | - | ✅ | ✅ | GitHub Secrets/Alerting tool |

### 시크릿 운영 규칙
- `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트 번들 포함 금지.
- 분기별(최대 90일) 회전 권장, 회전 시 runbook에 기록.
- 환경별 값 분리(같은 키 재사용 금지).
- 배포 전 `vercel env ls` / 호스팅 env 점검을 체크리스트에 포함.

---

## 4) 모니터링/알림

## 4.1 모니터링 구성

1. **Frontend/API (Vercel)**
   - Vercel Function/Edge 로그
   - Web Vitals (LCP/CLS/INP)
   - 5xx 비율, cold start, 응답시간

2. **Socket 서버**
   - `/healthz` 엔드포인트 추가(필수)
   - 프로세스 메트릭: CPU/MEM, restart 횟수
   - 도메인 메트릭: 동시 접속자, room 수, disconnect rate

3. **Supabase**
   - DB CPU/connection usage
   - long query, lock wait
   - Auth 실패율, Realtime 에러율

4. **외부 Uptime 체크**
   - `GET /` (웹)
   - `GET /api/health` (있다면)
   - `GET socket /healthz`

## 4.2 알림 정책 (권장)

- P1 (즉시 대응)
  - Prod 5xx > 5% (5분)
  - 서비스 다운타임 > 2분
  - 소켓 서버 전면 불능
- P2 (근무시간 대응)
  - 에러율 증가(1~5%) 15분 지속
  - p95 latency 임계치 초과
- 알림 채널
  - Discord `#ops-alerts` + Slack/PagerDuty 이중화 권장

## 4.3 SLO 제안

- 월 가용성 99.9%
- API p95 < 500ms
- 핵심 페이지 오류율 < 1%
- 대결방 연결 성공률 > 99%

---

## 5) 백업/복구 전략

## 5.1 백업 대상

1. **Supabase Postgres**
   - PITR(Point-In-Time Recovery) 활성화
   - 일 1회 logical backup(`pg_dump`) 보관
2. **Supabase Storage (이미지)**
   - 일 1회 객체 스토리지 증분 백업(외부 버킷 복제)
3. **Schema/IaC**
   - `supabase/migrations`를 Git으로 버전관리(이미 수행 중)

## 5.2 RPO/RTO 목표

- RPO: 15분 이내 (PITR 기준)
- RTO: 60분 이내 (핵심 서비스 복구)

## 5.3 복구 절차(요약)

1. 장애 시각 확정(T0)
2. 영향 범위 확인(DB only / Storage 포함)
3. Supabase PITR로 T0 직전 시점 복원
4. 애플리케이션 읽기전용/점검 모드로 검증
5. 트래픽 재개
6. 사후보고(원인/재발방지)

## 5.4 복구 리허설

- 월 1회 staging에서 restore drill 필수
- Drill 완료 기준
  - 복원 성공
  - 데이터 무결성 샘플 검증
  - 소요시간(RTO) 기록

---

## 6) 롤백 전략

## 6.1 프론트엔드(Vercel)

- 원칙: 배포 문제 발생 시 **즉시 이전 안정 배포로 롤백**
- 예시:
  - `vercel ls`로 직전 정상 릴리즈 확인
  - `vercel rollback <deployment>` 실행

## 6.2 Socket 서버

- 배포 단위: immutable image/tag (`socket:<git-sha>`)
- 실패 시 `N-1` 태그 재배포
- CORS/인증 설정 회귀 여부 우선 점검

## 6.3 DB 마이그레이션

- 원칙: Expand/Contract 2단계
  - 1단계: nullable/additive 변경
  - 2단계: 코드 전환 완료 후 정리(drop 등)
- 긴급 시 down migration보다 **PITR 복구 + 앱 롤백** 우선

## 6.4 기능 플래그

- Battle/실시간 기능은 kill-switch 준비 권장
- 장애 시 기능만 비활성화해 전체 서비스 영향 최소화

---

## 7) Runbook 체크리스트

## 7.1 배포 전 (Pre-deploy)
- [ ] CI(lint/type/test/build) 전체 green
- [ ] 변경사항에 migration 포함 여부 확인
- [ ] 신규/변경 env key 문서화 및 각 환경 반영
- [ ] 롤백 경로 확인(직전 안정 릴리즈 ID)
- [ ] 모니터링 대시보드/알림 정상 확인

## 7.2 Staging 배포
- [ ] `develop` 기준 자동 배포 성공
- [ ] smoke test: `/`, `/feed`, `/draw`, `/battle`
- [ ] 로그인/업로드/댓글/좋아요 핵심 플로우 점검
- [ ] socket 연결/채팅/타이머 동작 점검

## 7.3 Production 배포
- [ ] 승인자 확인 후 배포 시작
- [ ] 배포 완료 후 10~15분 집중 모니터링
- [ ] 에러율/지연/소켓 disconnect rate 확인
- [ ] 이상 시 즉시 롤백 또는 기능 플래그 off

## 7.4 장애 대응 (Incident)
- [ ] 심각도 분류(P1/P2/P3)
- [ ] 커뮤니케이션 채널 개설(`#incident-YYYYMMDD`)
- [ ] 임시완화(rollback, kill-switch, read-only) 우선
- [ ] 근본원인 분석(RCA) 및 재발방지 액션 등록

## 7.5 복구/백업 점검
- [ ] 백업 최신성 확인(성공 시각)
- [ ] 월간 restore drill 수행
- [ ] RPO/RTO 결과 기록
- [ ] 개선항목 backlog 반영

---

## 8) 즉시 실행 권장 액션 (다음 스프린트)

1. CI 워크플로우 표준화 (`ci.yml`, staging/prod deploy 분리)
2. socket-server `GET /healthz` 추가 + uptime 모니터링 연결
3. GitHub Environments(`staging`, `production`) 보호 규칙 설정
4. 시크릿 매트릭스 기반으로 Vercel/Socket host 값 정리
5. 월간 restore drill 일정 고정(캘린더/담당자 지정)

---

## 9) 현재 저장소 반영 상태 (2026-02-22 실행 반영)

- CI 강화: `.github/workflows/ci.yml` (lint/type-check/test/build + socket syntax)
- 환경 검증 스크립트: `scripts/preflight-env.mjs`
- 스테이징/프로덕션 워크플로우 추가:
  - `.github/workflows/deploy-staging.yml`
  - `.github/workflows/deploy-production.yml`
  - `.github/workflows/socket-deploy.yml`
- 실행 런북 문서: `docs/runbooks/deploy-rollback.md`

## 10) 운영 책임(RACI 간단안)

- Release Owner: 배포 승인 및 Go/No-Go 판단
- Infra Owner: 환경변수/배포파이프라인/롤백 책임
- App Owner: 기능 검증/스모크 테스트 책임
- On-call: 알림 수신 및 초기 대응

> 권장: 릴리즈마다 담당자 1명 명시, 장애 시 의사결정 단일화.
