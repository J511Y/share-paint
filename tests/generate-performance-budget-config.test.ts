import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = join(process.cwd(), 'scripts/generate-performance-budget-config.mjs');

describe('generate-performance-budget-config', () => {
  it('creates config with warn/fail thresholds and CI policy', () => {
    const dir = mkdtempSync(join(tmpdir(), 'perf-budget-'));
    const out = join(dir, 'docs/sprint/perf.json');

    try {
      execFileSync('node', [script, out], { encoding: 'utf8' });
      const json = JSON.parse(readFileSync(out, 'utf8'));
      expect(json.budgets.api.p95_ms.warn).toBe(400);
      expect(json.budgets.web.lcp_p75_ms.fail).toBe(3000);
      expect(json.ciPolicy.onFail).toBe('block-merge');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
