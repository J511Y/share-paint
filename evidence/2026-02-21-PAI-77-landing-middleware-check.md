# PAI-77 Frontend Check (Landing 500)

Date: 2026-02-21 (Asia/Seoul)
Branch: `hotfix/PAI-77-landing-500-guard`

## 1) 랜딩 진입 경로 / 미들웨어 유발 조건 점검

### Codebase scope check
- `find src -maxdepth 3 -type f` 결과: `src/e3Panel.js`, `src/e3Socket.js` (landing route 파일 없음)
- `grep -RIn "landing\|middleware\|next\|router\|500\|error" src tests package.json`
  - `landing`, `middleware`, `next`, `router` 관련 라우팅/미들웨어 코드 없음
  - 검색 히트는 e3 socket/client 에러 처리 영역만 확인됨

### 결론
- 현재 `develop` 기준 프론트 코드에는 서버 미들웨어/랜딩 라우트가 존재하지 않아,
  프론트 코드가 직접적으로 `landing 500`을 유발하는 경로는 재현/확인 불가.
- 다만 "첫 진입 차단" 완화를 위해 클라이언트 연결 초기화 실패 시 하드 크래시를 방지하는 가드를 반영함.

## 2) 오류 완화 코드 반영
- `E3SocketClient.connect()`에 안전 가드 추가
  - URL 누락 시 `connect_error` 이벤트 + `error` 상태 전환 (retriable)
  - WebSocket 생성자 예외를 catch해서 `connect_error` 이벤트로 노출
- `mountE3Panel()`에 사용자 안내 메시지 추가
  - 상태가 `error`일 때: `Connection failed. Please retry with Connect E3.`
  - connect 버튼 재활성 상태 유지로 즉시 재시도 가능

## 3) 테스트
- 실행: `npm test`
- 결과: pass 14 / fail 0
- 상세 로그: `evidence/2026-02-21-PAI-77-hotfix-test.log`
