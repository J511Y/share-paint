#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outPath = process.argv[2] || 'docs/sprint/soft-launch-kpi-spec.md';
const generatedAt = new Date().toISOString();

const md = `# Soft Launch KPI Spec\n\nGenerated: ${generatedAt}\n\n## Goals\n- Track onboarding and engagement during limited-user rollout\n- Catch reliability regressions before GA expansion\n\n## KPI Definitions\n| KPI | Formula | Target | Alert Threshold |
|---|---|---:|---:|
| signup_conversion_rate | signups / landing_visitors | >= 20% | < 15% |
| drawing_save_success_rate | successful_saves / save_attempts | >= 98% | < 96% |
| battle_completion_rate | completed_battles / started_battles | >= 75% | < 65% |
| api_5xx_rate | 5xx_count / total_api_requests | <= 1% | > 1% |
| realtime_error_rate | socket_error_events / total_socket_events | <= 3% | > 3% |
\n## Event Instrumentation\n- auth.signup.completed\n- drawing.save.attempt / drawing.save.success / drawing.save.failure\n- battle.started / battle.completed / battle.abandoned\n- api.error.5xx\n- realtime.error\n\n## Reporting Cadence\n- Hourly dashboard refresh\n- Daily PM summary during soft launch\n\n## Ownership\n- PM: KPI review + go/no-go recommendation\n- DevOps: dashboard + alert routing\n- Backend/Frontend: event emission quality\n`;

const abs = resolve(outPath);
mkdirSync(dirname(abs), { recursive: true });
writeFileSync(abs, md, 'utf8');
console.log(`Generated soft launch KPI spec: ${outPath}`);
