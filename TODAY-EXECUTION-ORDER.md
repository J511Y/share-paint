# 오늘 작업 오더 (share-paint) - 2026-02-18

## 0) 팀 구성 상태 (정합성 확인)
- 요청한 구성: **PM / Backend / Frontend / DevOps**
- 현재 상태: **sessions_spawn 호출 실패**(gateway `device token mismatch`), 각 에이전트 세션 미생성
- 운영 방식: **PM 주도 수동 실행 모드**로 진행. (에이전트에게 위임할 태스크는 문서화 후 게이트웨이 복구 시 재전파)

## 1) 오늘 착수 오더

### 오더-01 (최우선 / 백엔드-배틀 안정성)
- **목표:** PAI-23, PAI-24, PAI-22 한 묶음으로 배틀 상태 복구/타임아웃/신원 매핑 문제의 실무적 최소 안전장치 적용
- **담당(예상):** Backend
- **지연 시 리스크:** 배틀 중 이탈 시 상태 드리프트, 중복 이벤트 처리 불능
- **Acceptance:**
  - 배틀 이벤트 join/start/canvas/vote에 ACK 또는 오류 응답이 연결됨
  - 실패 시 사용자/콘솔에 명시적 에러 메시지
  - 재연결 3회 시나리오에 대한 체크포인트 로그/재현 기준 작성
- **현재 실측 진행:** `socket-server/server.js`, `src/hooks/useBattle.ts`에 ACK 기반 응답 파이프라인 1차 반영 완료

### 오더-02 (2순위 / 품질 게이트)
- **목표:** PAI-10, PAI-16, PAI-14
- **담당(예상):** Backend + Frontend
- **Acceptance:** 핵심 시나리오 E2E 자동/반자동 점검 항목 산출
- **실행:** 이슈별 PR 템플릿/수동 점검 포맷 먼저 정리 후 구현 착수

### 오더-03 (3순위 / 운영 준비)
- **목표:** PAI-11, PAI-13
- **담당(예상):** DevOps
- **Acceptance:** 배포/롤백 체크리스트 초안 작성 및 장애 대응 역할자 정의

## 2) 오늘 즉시 실행(실무) 할당표

| 에이전트 | 할당 과제 | 산출물 | 시작 규칙 |
|---|---|---|---|
| PM | 위 오더 승인/동결, 우선순위 재정렬, 일일 리포트 템플릿 고정 | `PM-VALIDATION-BOARD.md` 최신화 | 오늘 1회, 09:30 / 18:30 | 
| Backend | 배틀 이벤트 ACK/예외 응답/타이밍 가드, vote/vote중복 정책 1차 정리 | `/socket-server/server.js`, `/src/hooks/useBattle.ts` 수정노트 | 오더-01 완료 후 | 
| Frontend | 재연결/오류 메시지 UX 개선(필요 시) + 핵심 시나리오 수동 검증 노트 | `/src/app/(main)/battle/**`, 관련 스냅샷 | 오더-01 연동 | 
| DevOps | 배포 체크리스트·롤백 플로우 초안 작성 | `ROADMAP`/체크리스트 문서 1판 | 오더-03 착수 | 

## 3) 현재 코드 반영(시작 표시)
- `socket-server/server.js`에 `emitAck` 도입 및 주요 이벤트(`join_battle`, `leave_battle`, `ready_status`, `chat_message`, `canvas_update`, `vote`, `start_battle`)에 ACK/오류 응답 반영
- `src/hooks/useBattle.ts`에서 방 입장/챗/준비/그림동기화/시작/투표 시 ACK 응답을 error 상태로 반영

## 4) 다음 액션(후속)
1. 위 3개 오더에 대해 PR 게이트 전/후 상태를 `PM-VALIDATION-BOARD.md`에 라벨링
2. `review` 상태 상태명은 현재 미사용이므로 `Todo/Backlog`에서 `High` 우선순위 기준으로 1차 착수 이슈만 `Todo` 상향
3. sessions_spawn 복구 시: PM/Backend/Frontend/DevOps에 동일 작업 태스크 템플릿으로 재할당
