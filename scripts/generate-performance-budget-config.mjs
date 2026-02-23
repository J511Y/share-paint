#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outPath = process.argv[2] || 'docs/sprint/performance-budget-ci-thresholds.json';

const config = {
  generatedAt: new Date().toISOString(),
  budgets: {
    web: {
      lcp_p75_ms: { warn: 2500, fail: 3000 },
      tti_p75_ms: { warn: 3500, fail: 4500 }
    },
    api: {
      p95_ms: { warn: 400, fail: 600 },
      error_rate_percent: { warn: 1, fail: 2 }
    },
    realtime: {
      delivery_p95_ms: { warn: 300, fail: 500 },
      error_rate_percent: { warn: 3, fail: 5 }
    }
  },
  ciPolicy: {
    onWarn: 'report-pr-comment',
    onFail: 'block-merge'
  }
};

const abs = resolve(outPath);
mkdirSync(dirname(abs), { recursive: true });
writeFileSync(abs, JSON.stringify(config, null, 2) + '\n', 'utf8');
console.log(`Generated performance budget config: ${outPath}`);
