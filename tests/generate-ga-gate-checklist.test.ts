import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = join(process.cwd(), 'scripts/generate-ga-gate-checklist.mjs');

describe('generate-ga-gate-checklist', () => {
  it('creates a GA promotion checklist with decision section', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ga-gate-'));
    const out = join(dir, 'docs/sprint/ga.md');

    try {
      execFileSync('node', [script, out], { encoding: 'utf8' });
      const body = readFileSync(out, 'utf8');
      expect(body).toContain('# GA Promotion Gate Checklist');
      expect(body).toContain('## Decision');
      expect(body).toContain('APPROVE GA');
      expect(body).toContain('REJECT GA');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
