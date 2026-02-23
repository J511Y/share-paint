#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outPath = process.argv[2] || 'docs/sprint/launch-retro-backlog-reprioritization.md';
const generatedAt = new Date().toISOString();

const content = `# Launch Retrospective & Backlog Reprioritization\n\nGenerated: ${generatedAt}\n\n## 1) Launch Outcome Snapshot\n- Release window:\n- Target vs Actual:\n- Sev1/Sev2 incidents:\n- Core path success rate:\n\n## 2) What Went Well\n-\n\n## 3) What Didn't Go Well\n-\n\n## 4) Root Cause Themes\n- Reliability\n- Test coverage gaps\n- Operability/runbook gaps\n- Scope/coordination\n\n## 5) Backlog Reprioritization Matrix\n| Item | User Impact (1-5) | Risk Reduction (1-5) | Effort (1-5) | Priority Score (=Impact+Risk-Effort) | Decision |
|---|---:|---:|---:|---:|---|
| PAI-xx |  |  |  |  |  |
\n## 6) Next 7-day Commitments\n- [ ] Top-1\n- [ ] Top-2\n- [ ] Top-3\n\n## 7) Owners & Due Dates\n-\n\n## 8) Evidence Links\n- PRs:\n- Dashboards:\n- Incident logs:\n`;

const abs = resolve(outPath);
mkdirSync(dirname(abs), { recursive: true });
writeFileSync(abs, content, 'utf8');
console.log(`Generated launch retro template: ${outPath}`);
