#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outPath = process.argv[2] || 'docs/sprint/api-p95-report-template.md';
const ts = new Date().toISOString();

const md = `# API p95 Measurement Report Template\n\nGenerated: ${ts}\n\n## Scope\n- Environment: staging\n- Measurement window:\n- API groups: auth / paintings / battle / topics\n\n## Summary\n| API Group | p50 (ms) | p95 (ms) | Error Rate (%) | Status |
|---|---:|---:|---:|---|
| auth |  |  |  |  |
| paintings |  |  |  |  |
| battle |  |  |  |  |
| topics |  |  |  |  |
\n## Budget Check\n- Target: p95 <= 400ms\n- [ ] Pass\n- [ ] Fail\n\n## Hotspots & Actions\n- Slow endpoint #1:\n- Slow endpoint #2:\n- Optimization action items:\n\n## Evidence\n- Query logs:
- Dashboard snapshot:
- CI run link:
`;

const abs = resolve(outPath);
mkdirSync(dirname(abs), { recursive: true });
writeFileSync(abs, md, 'utf8');
console.log(`Generated API p95 report template: ${outPath}`);
