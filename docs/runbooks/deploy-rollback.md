# Deploy / Rollback Runbook (MVP)

## 1) Pre-deploy
1. `npm run lint`
2. `npm run type-check`
3. `npm run test:run`
4. `npm run build`
5. `node scripts/preflight-env.mjs staging` (or `production`)

## 2) Staging deploy
1. Merge to `develop`
2. Verify GitHub Action `ci.yml` + `deploy-staging.yml` green
3. Smoke checks
   - `/`
   - `/feed`
   - `/draw`
   - `/battle`
   - socket health: `GET <socket-url>/healthz`

## 3) Production deploy
1. Create release from `main`
2. Required reviewer approves production environment
3. Observe first 10~15 min
   - API 5xx
   - websocket disconnect/reconnect rate
   - save failure rate

## 4) Rollback
### Frontend/API (Vercel)
- Rollback to previous stable deployment in Vercel dashboard (or CLI)

### Socket server
- Redeploy previous image tag (`N-1`)
- Verify `/healthz`

### DB
- Prefer app rollback first
- If data corruption: execute PITR restore per Supabase runbook

## 5) Incident triage quick commands
- `curl -fsS <socket-url>/healthz`
- `curl -fsS <socket-url>/metrics`
- Check logs by `traceId` / `ackId`
