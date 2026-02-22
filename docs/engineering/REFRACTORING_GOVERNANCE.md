# Refactoring Governance (Incremental, Merge-safe)

## Purpose
Keep delivery speed while reducing structural risk. This governance defines **small, continuous refactoring** expectations for SOLID/DRY/YAGNI during feature development.

## Scope / Non-goals
- ✅ Scope: code organization, naming, duplication reduction, test maintainability, API consistency.
- ❌ Non-goals: large rewrites, architecture replacement, broad framework migration.

## Operating Principles
1. **Boy Scout Rule**: leave touched files cleaner than found.
2. **Refactor with feature work**: no standalone mega-refactor PRs.
3. **YAGNI-first**: abstract only after second real use-case.
4. **Fail-safe changes**: preserve behavior; add/keep tests around modified areas.

## Current Hotspot Audit (Top 10)

| # | Hotspot | Evidence | Risk | Incremental fix |
|---|---|---|---|---|
| 1 | Socket server monolith | `socket-server/server.js` (~521 LOC) | High change-collision, hard testing | Split into `auth`, `battle-state`, `event-handlers`, `timer` modules |
| 2 | Duplicated socket ready handling | `ready_status` and `ready_update` in `socket-server/server.js` | Divergent behavior bugs | Extract shared `applyReadyStatus()` function |
| 3 | API wrapper inconsistency | Several routes in `src/app/api/**/route.ts` bypass `apiHandler/authApiHandler` | Uneven auth/log/error contracts | Standardize routes on wrapper pattern |
| 4 | Repeated auth guard logic | `src/app/api/paintings/[id]/like/route.ts`, `src/app/api/users/[id]/follow/route.ts` | Duplication + drift | Shared auth utility or wrapper migration |
| 5 | Response style inconsistency | Mixed KR/EN errors + uneven status semantics across routes | API client confusion | Define response/error convention and enforce per route |
| 6 | Suspected mojibake user text | `src/app/(main)/battle/[id]/page.tsx` corrupted strings/comments | UX quality + i18n defects | Restore UTF-8 strings; move literals to i18n constants |
| 7 | Complex battle hook | `src/hooks/useBattle.ts` (~269 LOC, lint dependency warning) | Stale closures, fragile side effects | Split by concern: timer, socket lifecycle, actions |
| 8 | Participant state integrity gap | `src/stores/battleStore.ts` `addParticipant` appends blindly | Duplicate participant UI state | Upsert participant by `id` |
| 9 | Large monolithic tests | `src/hooks/useTimer.test.ts`, `src/components/canvas/Canvas.test.tsx`, `src/app/(main)/draw/DrawingCanvas.test.tsx` | Slow maintenance, noisy failure localization | Introduce test factories/helpers; split by behavior domains |
| 10 | Lint debt baseline | `npm run lint` reports 38 warnings (unused vars, hook deps, etc.) | Signal-to-noise erosion | Warning burn-down target by area per sprint |

## Guardrails (Thresholds)
- Production file soft limit: **280 LOC**
- Test file soft limit: **450 LOC**
- No new raw `console.log` in production paths
- Prefer `apiHandler/authApiHandler` in API routes

Automated report command:

```bash
npm run governance:check
npm run governance:check:strict
```

## Refactoring Workflow
1. During task planning, identify touched hotspot(s).
2. Add at least one scoped cleanup commit with behavior parity.
3. Run: lint + type-check + focused tests + governance check.
4. Document before/after impact in PR body.

## Definition of Done (Refactoring-aware)
- No increase in lint warnings in touched files.
- No net complexity increase for modified modules.
- At least one duplication or naming inconsistency reduced when touching hotspot areas.
- Tests remain green for touched behavior.

## Ownership Recommendations
- **Frontend**: battle page text cleanup, hook decomposition, test modularization.
- **Backend**: API wrapper migration and response schema consistency.
- **DevOps/Platform**: governance check wiring in CI non-blocking first, strict mode after baseline cleanup.
