#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

pass(){ echo -e "${GREEN}[PASS]${NC} $1"; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $1"; }
fail(){ echo -e "${RED}[FAIL]${NC} $1"; }

pass "리뷰 에이전트 게이트 시작: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"

# 1) Diff sanity
if ! git diff --check >/tmp/review-gate.diffcheck 2>&1; then
  fail "whitespace/conflict marker check failed (details: /tmp/review-gate.diffcheck)"
  exit 1
else
  pass "git diff check 통과"
fi

# 2) Detect changed files
CHANGED=$(git status --short | awk '{print $2}')
if [ -z "$CHANGED" ]; then
  warn "변경 파일 없음"
else
  echo "변경 파일:"
  echo "$CHANGED"
fi

# 3) Lightweight static checks (존재할 때만 실행)
if [ -f package.json ]; then
  if [ -f package-lock.json ] || [ -f pnpm-lock.yaml ] || [ -f yarn.lock ]; then
    if [ -d node_modules ]; then
      if npm -s run lint >/tmp/review-gate.lint 2>&1; then
        pass "npm run lint 통과"
      else
        fail "npm run lint 실패 (확인: /tmp/review-gate.lint)"
      fi

      if npm -s run type-check >/tmp/review-gate.typecheck 2>&1; then
        pass "npm run type-check 통과"
      else
        fail "npm run type-check 실패 (확인: /tmp/review-gate.type-check)"
      fi
    else
      warn "node_modules 없음: lint/type-check 실행 생략"
    fi
  else
    warn "lockfile 없음: dependency install 상태 확인 필요"
  fi
fi

# 4) Review targets hints
if echo "$CHANGED" | grep -q 'socket-server/server.js\|src/hooks/useBattle.ts\|src/stores/battleStore.ts\|src/app/(main)/battle'; then
  pass "실시간/배틀 경로 변경 감지: 인증·타이밍·재접속 포인트 점검 필요 (수동 검토 권고)"
fi

# 5) Risk summary template
cat > /tmp/review-gate-summary.md <<'EOF'
# Reviewer Gate Summary
- date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- result: TODO (PASS / PASS_WITH_CONDITIONS / BLOCK)
- changed_files:
EOF

echo "$(echo "$CHANGED" | sed 's/^/  - /')" >> /tmp/review-gate-summary.md

pass "요약 생성: /tmp/review-gate-summary.md"
pass "리뷰 에이전트 게이트 완료"
