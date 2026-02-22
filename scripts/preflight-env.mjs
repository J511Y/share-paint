#!/usr/bin/env node

const target = process.argv[2] || process.env.DEPLOY_TARGET || 'staging';

const commonRequired = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SOCKET_URL',
];

const serverRequired = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'BATTLE_PASSWORD_PEPPER',
];

const socketRequired = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CLIENT_URL',
];

const redisOptional = ['REDIS_URL'];

function missingKeys(keys) {
  return keys.filter((key) => !process.env[key] || !String(process.env[key]).trim());
}

function printResult(label, missing) {
  if (missing.length === 0) {
    console.log(`✅ ${label}`);
    return true;
  }

  console.error(`❌ ${label}`);
  for (const key of missing) {
    console.error(`   - Missing: ${key}`);
  }
  return false;
}

console.log(`Running env preflight for target: ${target}`);

const checks = [
  printResult('Client/public env', missingKeys(commonRequired)),
  printResult('Server secret env', missingKeys(serverRequired)),
  printResult('Socket server env', missingKeys(socketRequired)),
];

if (process.env.WS_REDIS_ADAPTER_ENABLED === 'true') {
  checks.push(printResult('Redis adapter env', missingKeys(redisOptional)));
}

if (checks.every(Boolean)) {
  console.log('✅ Preflight passed');
  process.exit(0);
}

console.error('Preflight failed. Fix missing env vars before deploy.');
process.exit(1);
