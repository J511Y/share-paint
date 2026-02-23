#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outPath = process.argv[2] || 'docs/runbooks/oncall-contact-plan.md';
const ts = new Date().toISOString();

const md = `# On-call & Incident Contact Plan\n\nGenerated: ${ts}\n\n## 1) Roles\n- Incident Commander (IC):\n- Communications Lead:\n- Backend On-call:\n- Frontend On-call:\n- DevOps On-call:\n\n## 2) Escalation Matrix\n| Severity | Initial Owner | Escalation (10m) | Escalation (30m) |
|---|---|---|---|
| Sev1 | IC | Engineering Lead | Product/Founder |
| Sev2 | On-call Engineer | IC | Engineering Lead |
| Sev3 | On-call Engineer | Team Channel | Next Business Day |
\n## 3) Contact Channels\n- Primary incident channel:\n- Secondary backup channel:\n- Paging system:\n\n## 4) Communication SLA\n- MTTA target: <= 10 minutes\n- First status update: <= 15 minutes\n- Update cadence during active incident: every 30 minutes\n\n## 5) Handover Checklist\n- [ ] Incident summary posted\n- [ ] Customer impact assessed\n- [ ] Mitigation/rollback decision recorded\n- [ ] Follow-up ticket created\n`;

const abs = resolve(outPath);
mkdirSync(dirname(abs), { recursive: true });
writeFileSync(abs, md, 'utf8');
console.log(`Generated on-call contact plan: ${outPath}`);
