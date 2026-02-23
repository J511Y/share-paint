#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outPath = process.argv[2] || 'docs/qa/regression-sheet.md';
const date = new Date().toISOString();

const suites = [
  'Auth: login/register/session redirect',
  'Draw: canvas stroke/erase/color/brush/save',
  'Feed: upload/list/like/comment/follow',
  'Battle: join/start/reconnect/vote/result',
  'API: paintings/topics/battle error contract',
  'Security: env preflight + secret scan',
];

const lines = [
  '# Regression Test Sheet',
  '',
  `Generated: ${date}`,
  '',
  '## Run Metadata',
  '- Build SHA: `<fill-after-run>`',
  '- Environment: staging',
  '- Runner: `<agent>`',
  '',
  '## Checklist',
  ...suites.map((name) => `- [ ] ${name}`),
  '',
  '## Notes',
  '- failures:',
  '- repro steps:',
  '- evidence links:',
  '',
];

const abs = resolve(outPath);
mkdirSync(dirname(abs), { recursive: true });
writeFileSync(abs, lines.join('\n'), 'utf8');
console.log(`Generated regression sheet: ${outPath}`);
