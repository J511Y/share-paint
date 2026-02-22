import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = join(process.cwd(), 'scripts/generate-api-p95-report-template.mjs');

describe('generate-api-p95-report-template', () => {
  it('creates report skeleton with p95 budget section', () => {
    const dir = mkdtempSync(join(tmpdir(), 'api-p95-'));
    const out = join(dir, 'docs/sprint/api-p95.md');

    try {
      execFileSync('node', [script, out], { encoding: 'utf8' });
      const body = readFileSync(out, 'utf8');
      expect(body).toContain('# API p95 Measurement Report Template');
      expect(body).toContain('Target: p95 <= 400ms');
      expect(body).toContain('| API Group | p50 (ms) | p95 (ms) |');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
