import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = join(process.cwd(), 'scripts/generate-soft-launch-kpi-spec.mjs');

describe('generate-soft-launch-kpi-spec', () => {
  it('creates KPI spec with key launch metrics', () => {
    const dir = mkdtempSync(join(tmpdir(), 'soft-launch-kpi-'));
    const out = join(dir, 'docs/sprint/kpi.md');

    try {
      execFileSync('node', [script, out], { encoding: 'utf8' });
      const body = readFileSync(out, 'utf8');
      expect(body).toContain('# Soft Launch KPI Spec');
      expect(body).toContain('drawing_save_success_rate');
      expect(body).toContain('battle_completion_rate');
      expect(body).toContain('api_5xx_rate');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
