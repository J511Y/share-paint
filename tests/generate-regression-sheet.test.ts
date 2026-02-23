import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = join(process.cwd(), 'scripts/generate-regression-sheet.mjs');

describe('generate-regression-sheet', () => {
  it('creates markdown with required checklist sections', () => {
    const dir = mkdtempSync(join(tmpdir(), 'regression-sheet-'));
    const out = join(dir, 'docs/qa/regression-sheet.md');
    try {
      execFileSync('node', [script, out], { encoding: 'utf8' });
      const body = readFileSync(out, 'utf8');
      expect(body).toContain('# Regression Test Sheet');
      expect(body).toContain('## Checklist');
      expect(body).toContain('Battle: join/start/reconnect/vote/result');
      expect(body).toContain('Security: env preflight + secret scan');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
