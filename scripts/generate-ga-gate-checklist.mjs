#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outPath = process.argv[2] || 'docs/sprint/ga-promotion-gate-checklist.md';
const now = new Date().toISOString();

const md = `# GA Promotion Gate Checklist\n\nGenerated: ${now}\n\n## Gate A: Stability (7-day)\n- [ ] Sev1 incidents = 0\n- [ ] Sev2 incidents = 0\n- [ ] Core path success >= 98%\n\n## Gate B: Performance\n- [ ] Web LCP p75 <= 2.5s\n- [ ] Web TTI p75 <= 3.5s\n- [ ] API p95 <= 400ms\n- [ ] Realtime delivery p95 <= 300ms\n\n## Gate C: Operability\n- [ ] Alerting policies active and tested\n- [ ] On-call owner assigned\n- [ ] Rollback drill passed in last 7 days\n\n## Gate D: Quality\n- [ ] Core E2E pass rate >= 95% over last 10 runs\n- [ ] Critical regression sheet completed\n\n## Decision\n- [ ] APPROVE GA\n- [ ] REJECT GA (requires remediation)\n\n## Evidence Links\n- dashboards:\n- ci runs:\n- incidents:\n- rollback drill:\n`;

const abs = resolve(outPath);
mkdirSync(dirname(abs), { recursive: true });
writeFileSync(abs, md, 'utf8');
console.log(`Generated GA gate checklist: ${outPath}`);
