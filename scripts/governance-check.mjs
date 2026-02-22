#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const STRICT = process.argv.includes('--strict');
const ROOT = process.cwd();

const TARGET_DIRS = ['src', 'socket-server'];
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const IGNORE_SEGMENTS = new Set(['node_modules', '.next', '.git', 'coverage', 'dist', 'build']);

const LIMITS = {
  nonTestFileLines: 280,
  testFileLines: 450,
};

const findings = [];

function isIgnored(filePath) {
  return filePath.split(path.sep).some((segment) => IGNORE_SEGMENTS.has(segment));
}

function isCodeFile(filePath) {
  return CODE_EXTENSIONS.has(path.extname(filePath));
}

function isTestFile(filePath) {
  return /\.test\./.test(filePath) || /(^|\/)test(s)?\//.test(filePath);
}

function addFinding(level, rule, file, detail) {
  findings.push({ level, rule, file, detail });
}

async function walk(dirPath) {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const out = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(ROOT, fullPath);

    if (isIgnored(relativePath)) continue;

    if (entry.isDirectory()) {
      out.push(...(await walk(fullPath)));
    } else if (entry.isFile() && isCodeFile(relativePath)) {
      out.push(relativePath);
    }
  }

  return out;
}

function lineCount(content) {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

function checkLineCount(filePath, content) {
  const lines = lineCount(content);
  const test = isTestFile(filePath);
  const limit = test ? LIMITS.testFileLines : LIMITS.nonTestFileLines;

  if (lines > limit) {
    addFinding(
      'warn',
      test ? 'file-size:test' : 'file-size:prod',
      filePath,
      `${lines} lines (limit ${limit}). Split by responsibility to preserve SRP.`
    );
  }
}

function checkConsoleUsage(filePath, content) {
  if (isTestFile(filePath)) return;
  const matches = content.match(/console\.log\s*\(/g);
  if (matches && matches.length > 0) {
    addFinding(
      'warn',
      'console-log',
      filePath,
      `${matches.length} console.log call(s). Use structured logger or guard with explicit dev-only utility.`
    );
  }
}

function checkMojibake(filePath, content) {
  if (!content) return;

  // Replacement char or suspicious '?'+Hangul pattern often indicates corrupted text.
  if (content.includes('�') || /\?[가-힣]/.test(content)) {
    addFinding(
      'warn',
      'encoding-suspect',
      filePath,
      'Possible mojibake/corrupted text detected. Verify UTF-8 source and user-facing copy.'
    );
  }
}

function checkApiRouteConventions(filePath, content) {
  const isApiRoute = /^src\/app\/api\/.+\/route\.ts$/.test(filePath);
  if (!isApiRoute) return;

  const hasRouteHandlers = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/.test(content);
  const usesWrapper = /apiHandler\(|authApiHandler\(/.test(content);

  if (hasRouteHandlers && !usesWrapper) {
    addFinding(
      'warn',
      'api-wrapper',
      filePath,
      'Route handlers bypass apiHandler/authApiHandler. Standardize for logging/auth/error envelope.'
    );
  }

  const authCalls = content.match(/supabase\.auth\.getUser\(\)/g);
  if (authCalls && authCalls.length > 1) {
    addFinding(
      'warn',
      'api-auth-duplication',
      filePath,
      `Repeated supabase.auth.getUser() calls (${authCalls.length}). Extract/auth once per request path.`
    );
  }
}

async function main() {
  const files = [];
  for (const dir of TARGET_DIRS) {
    const abs = path.join(ROOT, dir);
    files.push(...(await walk(abs)));
  }

  for (const filePath of files) {
    const abs = path.join(ROOT, filePath);
    const content = await fs.readFile(abs, 'utf8');

    checkLineCount(filePath, content);
    checkConsoleUsage(filePath, content);
    checkMojibake(filePath, content);
    checkApiRouteConventions(filePath, content);
  }

  findings.sort((a, b) => a.file.localeCompare(b.file) || a.rule.localeCompare(b.rule));

  if (findings.length === 0) {
    console.log('✅ Governance check passed with no findings.');
    return;
  }

  console.log(`⚠️  Governance findings: ${findings.length}`);
  for (const finding of findings) {
    const marker = finding.level === 'error' ? 'ERROR' : 'WARN';
    console.log(`- [${marker}] (${finding.rule}) ${finding.file}: ${finding.detail}`);
  }

  if (STRICT) {
    console.error('\n❌ Strict mode enabled: failing due to governance findings.');
    process.exit(1);
  }

  console.log('\nℹ️ Non-strict mode: report only. Use --strict to fail CI.');
}

main().catch((error) => {
  console.error('governance-check failed unexpectedly:', error);
  process.exit(1);
});
