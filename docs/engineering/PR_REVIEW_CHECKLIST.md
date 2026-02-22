# PR Review Checklist (SOLID/DRY/YAGNI)

Use this as a mandatory reviewer pass before merge.

## 1) Scope & Safety
- [ ] PR scope is small and cohesive (single concern).
- [ ] No hidden broad refactor without explicit rationale.
- [ ] Risky paths have rollback notes.

## 2) Architecture / Design
- [ ] SRP respected: no god function/component expansion.
- [ ] New abstraction introduced only with 2+ concrete call sites (YAGNI).
- [ ] Duplication removed or intentionally documented.
- [ ] Naming reflects domain intent (no vague `data`, `handler2`, etc.).

## 3) API / Backend Contract
- [ ] Route uses `apiHandler`/`authApiHandler` unless justified.
- [ ] Auth/validation/error handling follow project conventions.
- [ ] Response schema/status codes are consistent with adjacent endpoints.
- [ ] No accidental contract break (or versioning/migration note provided).

## 4) Frontend Quality
- [ ] Components/hooks keep clear responsibility boundaries.
- [ ] No user-visible corrupted text/encoding artifacts.
- [ ] Derived state is not duplicated unnecessarily.
- [ ] Accessibility impact considered for changed UI paths.

## 5) Testing
- [ ] Tests cover changed behavior and critical edge cases.
- [ ] Large test files were not further bloated without reason.
- [ ] New test helpers used when repetitive setup appears.
- [ ] Test names explain behavior, not implementation details.

## 6) Operational Hygiene
- [ ] `npm run lint` passes.
- [ ] `npm run type-check` passes.
- [ ] Relevant tests pass (`npm run test:run` or targeted set).
- [ ] `npm run governance:check` reviewed; new findings explained.

## 7) Review Decision
- [ ] APPROVE
- [ ] REQUEST CHANGES

### Hard blockers
- Missing auth/validation in new API handlers.
- New monolithic file/function without decomposition plan.
- Corrupted text or broken i18n strings.
- Unbounded side-effect logic added to hooks/components.
