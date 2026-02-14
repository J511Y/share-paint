## Linear Task Runbook (Strict workflow)

목적
이 스킬은 Linear 기반 작업을 수행할 때 진행 규율을 고정한다.

적용 시점
- Linear에서 작업을 수행하거나, Linear 이슈를 기준으로 코드 변경이 필요한 작업.
- 특히 `In Progress`, `Todo`, `Backlog` 조회 후 착수할 때.

필수 실행 흐름
1. Linear에서 작업 동기화
   - `mcp__linear__list_issues`로 `team: "Paint-share"`에서 대상 상태 조회
   - 작업 대기열: `In Progress` → `Todo` → `Backlog`
   - 상태가 비어 있으면 다음 상태로 이동

2. 작업 선택
   - High 우선
   - 동일 레벨은 최신 업데이트 순
- 선택한 이슈는 즉시 `assignee: "me"` + `state: "In Progress"`로 이동

3. 작업 계획 수립
   - 변경 파일/범위/완료 조건을 3~5개 항목으로 요약
- 필요한 스킬 목록을 작업 코멘트에 선행 기록
  - Frontend/Next.js: `vercel-react-best-practices`
  - 컴포넌트 재사용성: `vercel-composition-patterns`
  - 모바일: `vercel-react-native-skills`
  - Supabase/쿼리/마이그레이션: `supabase-postgres-best-practices`
  - UI 리뷰: `web-design-guidelines`
  - 기타 Linear 운영: `linear`

4. 진행 코멘트
   - 시작 시: 목표, 범위, 사용 스킬
   - 중간 시점: 발견 이슈/우회/리스크
   - 완료 전: 실제 변경 파일 및 검증/미검증 상태

5. 커밋 규칙
   - 각 이슈별 코드 변경은 작업 단위별로 커밋
   - 최소 메시지 형식: `feat/fix/docs/chore/refactor/test/qa: ...`
   - 커밋은 Linear 이슈와 매핑 가능한 제목 사용
   - 진행 중 커밋이 있어야 한다면 `WIP` 금지(가능한 즉시 가시 동작 가능 상태 커밋)

6. 마무리
   - 완료 후 변경사항을 다시 Linear 이슈 코멘트로 기록
   - `PAI-*` 식별자 누락 없이 결과 링크/파일 목록 기재

필수 금지
- Linear에서 가져온 이슈를 문서화 없이 진행 착수
- 작업 중 스킬 사용 누락
- 진행 코멘트와 커밋 생략

