import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = join(process.cwd(), 'scripts/generate-oncall-contact-plan.mjs');

describe('generate-oncall-contact-plan', () => {
  it('creates on-call runbook with escalation matrix', () => {
    const dir = mkdtempSync(join(tmpdir(), 'oncall-plan-'));
    const out = join(dir, 'docs/runbooks/oncall.md');

    try {
      execFileSync('node', [script, out], { encoding: 'utf8' });
      const body = readFileSync(out, 'utf8');
      expect(body).toContain('# On-call & Incident Contact Plan');
      expect(body).toContain('## 2) Escalation Matrix');
      expect(body).toContain('Sev1');
      expect(body).toContain('MTTA target: <= 10 minutes');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
