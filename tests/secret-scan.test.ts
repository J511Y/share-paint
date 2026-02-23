import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const scriptPath = join(process.cwd(), 'scripts/secret-scan.mjs');

describe('secret-scan script', () => {
  it('passes on safe files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'secret-scan-safe-'));
    try {
      writeFileSync(join(dir, 'safe.ts'), 'export const ok = true;\n');
      const out = execFileSync('node', [scriptPath], { cwd: dir, encoding: 'utf8' });
      expect(out).toContain('Secret scan passed');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails on leaked github token pattern', () => {
    const dir = mkdtempSync(join(tmpdir(), 'secret-scan-leak-'));
    try {
      const injectedToken = ['gh', 'p_', 'abcdefghijklmnopqrstuvwxyz123456'].join('');
      writeFileSync(
        join(dir, 'bad.ts'),
        `const token = "${injectedToken}";\n`
      );
      expect(() => execFileSync('node', [scriptPath], { cwd: dir, encoding: 'utf8' })).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
