#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.vercel']);
const TEXT_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml', '.env', '.txt']);

const PATTERNS = [
  { name: 'Supabase service key', re: /(?:SUPABASE_SERVICE_ROLE_KEY\s*=\s*|service_role\.)[A-Za-z0-9_\-]{20,}/g },
  { name: 'GitHub token', re: /ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{40,}/g },
  { name: 'Slack token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'OpenAI key', re: /sk-[A-Za-z0-9]{20,}/g },
];

function shouldScan(file) {
  const dot = file.lastIndexOf('.');
  if (dot === -1) return false;
  return TEXT_EXTS.has(file.slice(dot));
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full);
    if (SKIP_DIRS.has(entry) || rel.startsWith('.agents/')) continue;
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (shouldScan(entry)) files.push(full);
  }
  return files;
}

let findings = [];
for (const file of walk(ROOT)) {
  const body = readFileSync(file, 'utf8');
  const lines = body.split('\n');
  lines.forEach((line, idx) => {
    for (const p of PATTERNS) {
      if (p.re.test(line)) {
        findings.push({ file: relative(ROOT, file), line: idx + 1, pattern: p.name });
      }
      p.re.lastIndex = 0;
    }
  });
}

if (findings.length > 0) {
  console.error('❌ Secret scan failed');
  for (const f of findings) {
    console.error(`- ${f.file}:${f.line} (${f.pattern})`);
  }
  process.exit(1);
}

console.log('✅ Secret scan passed (no known token patterns found)');
