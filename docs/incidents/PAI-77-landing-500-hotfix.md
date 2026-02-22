# PAI-77 랜딩 500 핫픽스 대응

## 1) 점검 결과 (Vercel / 런타임 / 미들웨어 / 환경변수)

### 증상
- `https://share-paint.vercel.app/` 요청 시 `500`
- 응답 헤더: `x-vercel-error: MIDDLEWARE_INVOCATION_FAILED`

### 재현 증거 (prod)
```bash
curl -i https://share-paint.vercel.app/
```
- `HTTP/2 500`
- `x-vercel-error: MIDDLEWARE_INVOCATION_FAILED`

### 원인
- 기존 `src/middleware.ts` matcher가 거의 모든 경로(`/`)에 미들웨어를 적용.
- `src/lib/supabase/middleware.ts`에서 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 누락 시에도 Supabase client 생성을 강제.
- Vercel 런타임(Edge Proxy)에서 미들웨어 초기화 단계에서 예외가 발생해 랜딩까지 500으로 전파.

### 변경 사항
- 미들웨어 적용 범위를 인증 관련 경로로 축소:
  - `/draw/:path*`
  - `/battle/:path*`
  - `/profile/:path*`
  - `/login/:path*`
  - `/register/:path*`
- Supabase env 누락 시 fail-safe 추가:
  - 보호 경로는 `/login?redirect=...` 리다이렉트
  - 그 외 경로는 `NextResponse.next()`로 500 전파 차단
  - session check 예외 발생 시에도 동일 fail-safe 처리

---

## 2) 재배포 / 롤백 실행 경로 (Runbook)

> 아래 명령은 Vercel 토큰이 있는 운영자 계정에서 실행.

### 2-1. 환경변수 복구 (최우선)
```bash
# 필수 env 확인
npx vercel env ls production

# 누락 시 추가
printf "%s" "$NEXT_PUBLIC_SUPABASE_URL" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
printf "%s" "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
printf "%s" "$SUPABASE_SERVICE_ROLE_KEY" | npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

### 2-2. 재배포
```bash
# Git 연동 배포라면: 대상 브랜치 merge 후 자동 배포 확인
# 수동 트리거가 필요하면:
npx vercel --prod --yes
```

### 2-3. 긴급 롤백
```bash
# 최근 배포 조회
npx vercel ls

# 직전 정상 배포를 production alias로 롤백
npx vercel rollback <DEPLOYMENT_URL_OR_ID> --yes
```

---

## 3) 검증 계획 (완료조건: 랜딩 정상 여부)

### 배포 전 로컬 검증
```bash
npm run build
npm run start -- -p 4010
curl -i http://localhost:4010/        # 기대: 200
curl -i http://localhost:4010/draw    # 기대: 307 -> /login
```

### 배포 후 프로덕션 검증
```bash
curl -i https://share-paint.vercel.app/ | sed -n '1,20p'
# 기대: HTTP/2 200, x-vercel-error 헤더 없음

curl -i https://share-paint.vercel.app/draw | sed -n '1,20p'
# 기대: 307/308 + /login redirect
```

### 보강 확인
- Vercel Function / Runtime logs에서 `MIDDLEWARE_INVOCATION_FAILED` 재발 없음 확인
- 5분 간격으로 최소 3회 재확인(일시적 캐시/리전 편차 배제)
