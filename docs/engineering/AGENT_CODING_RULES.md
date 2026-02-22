# Agent Coding Rules (Autonomous Development)

These rules apply to coding agents working on this repository.

## 0) Planning Gate (Required)
Before implementation, provide:
1. Problem statement
2. In-scope / out-of-scope
3. Acceptance criteria
4. Validation plan (lint/type-check/tests)

No implementation starts without this gate.

## 1) Change Size & Structure
- Prefer incremental PRs (target ~150-300 changed LOC unless justified).
- Do not mix unrelated refactor and feature changes.
- Keep each commit explainable in one sentence.

## 2) SOLID/DRY/YAGNI Rules
- **S**: avoid adding new responsibilities to already large files.
- **O/I/D**: inject dependencies where practical; avoid tight coupling in hooks/services.
- **DRY**: after second repetition, extract shared utility.
- **YAGNI**: no speculative abstraction for hypothetical future features.

## 3) API Route Rules
- Prefer `apiHandler` / `authApiHandler` wrappers.
- Standardize validation and error envelope per route.
- Keep route handlers thin; move business logic to lib/service modules when growth starts.

## 4) Frontend Rules
- Large hooks/components must be split by concern before adding more branches.
- User-facing strings must be valid UTF-8 and consistent language policy.
- Avoid duplicated local state when store/selectors already provide source of truth.

## 5) Testing Rules
- New behavior requires tests or explicit risk waiver.
- If a test file exceeds maintainability threshold, split by behavior group.
- Prefer reusable fixture/builders over repeated setup blocks.

## 6) Logging & Observability
- No new raw `console.log` in production paths.
- Use existing logging utility conventions where available.

## 7) Required Validation Commands
Run before requesting review:

```bash
npm run lint
npm run type-check
npm run test:run
npm run governance:check
```

## 8) PR Description Minimum
- Why this change
- What changed (by area)
- Risk and rollback note
- Test evidence (exact commands + result)

## 9) Anti-patterns (Reject)
- God-file expansion without decomposition plan
- Copy/paste route auth/validation blocks in new endpoints
- Mixed semantics in API responses for similar operations
- “Temporary” TODOs without issue linkage
