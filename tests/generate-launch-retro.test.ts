import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = join(process.cwd(), 'scripts/generate-launch-retro.mjs');

describe('generate-launch-retro', () => {
  it('creates launch retro markdown with reprioritization matrix', () => {
    const dir = mkdtempSync(join(tmpdir(), 'launch-retro-'));
    const out = join(dir, 'docs/sprint/launch-retro.md');

    try {
      execFileSync('node', [script, out], { encoding: 'utf8' });
      const body = readFileSync(out, 'utf8');
      expect(body).toContain('# Launch Retrospective & Backlog Reprioritization');
      expect(body).toContain('## 5) Backlog Reprioritization Matrix');
      expect(body).toContain('Priority Score (=Impact+Risk-Effort)');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
