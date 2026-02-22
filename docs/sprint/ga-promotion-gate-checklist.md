# GA Promotion Gate Checklist

Generated: 2026-02-22T16:34:00.982Z

## Gate A: Stability (7-day)
- [ ] Sev1 incidents = 0
- [ ] Sev2 incidents = 0
- [ ] Core path success >= 98%

## Gate B: Performance
- [ ] Web LCP p75 <= 2.5s
- [ ] Web TTI p75 <= 3.5s
- [ ] API p95 <= 400ms
- [ ] Realtime delivery p95 <= 300ms

## Gate C: Operability
- [ ] Alerting policies active and tested
- [ ] On-call owner assigned
- [ ] Rollback drill passed in last 7 days

## Gate D: Quality
- [ ] Core E2E pass rate >= 95% over last 10 runs
- [ ] Critical regression sheet completed

## Decision
- [ ] APPROVE GA
- [ ] REJECT GA (requires remediation)

## Evidence Links
- dashboards:
- ci runs:
- incidents:
- rollback drill:
