# Soft Launch KPI Spec

Generated: 2026-02-22T17:04:02.192Z

## Goals
- Track onboarding and engagement during limited-user rollout
- Catch reliability regressions before GA expansion

## KPI Definitions
| KPI | Formula | Target | Alert Threshold |
|---|---|---:|---:|
| signup_conversion_rate | signups / landing_visitors | >= 20% | < 15% |
| drawing_save_success_rate | successful_saves / save_attempts | >= 98% | < 96% |
| battle_completion_rate | completed_battles / started_battles | >= 75% | < 65% |
| api_5xx_rate | 5xx_count / total_api_requests | <= 1% | > 1% |
| realtime_error_rate | socket_error_events / total_socket_events | <= 3% | > 3% |

## Event Instrumentation
- auth.signup.completed
- drawing.save.attempt / drawing.save.success / drawing.save.failure
- battle.started / battle.completed / battle.abandoned
- api.error.5xx
- realtime.error

## Reporting Cadence
- Hourly dashboard refresh
- Daily PM summary during soft launch

## Ownership
- PM: KPI review + go/no-go recommendation
- DevOps: dashboard + alert routing
- Backend/Frontend: event emission quality
