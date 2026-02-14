# PaintShare - 그림 스피드런 SNS

## 프로젝트 개요

PaintShare는 웹 기반 그림 공유 플랫폼으로, 제한된 시간 내에 주어진 주제로 그림을 그리고 공유하는 "그림 스피드런" 컨셉의 SNS입니다.

### 핵심 기능

1. **랜덤 주제 & 시간 제한 드로잉**
   - 시간 옵션: 30초, 1분, 5분, 10분, 무제한
   - 랜덤 주제 생성 시스템

2. **웹 캔버스 기반 페인팅 툴**
   - HTML5 Canvas 기반 드로잉
   - 기본 드로잉 도구 (펜, 지우개, 색상 선택 등)
   - 실시간 타이머 연동

3. **SNS 기능**
   - 그림 피드 (갤러리)
   - 좋아요 & 댓글
   - 프로필 & 팔로우 시스템

4. **실시간 대결방 (WebSocket)**
   - 방장의 주제/시간 설정
   - 실시간 채팅 & 이모티콘
   - 참가자 캔버스 실시간 중계
   - 모바일 최적화

---

## 기술 스택

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Canvas**: Fabric.js 또는 Konva.js
- **WebSocket Client**: Socket.io-client

### Backend
- **API**: Next.js API Routes + Supabase
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (이미지 저장)
- **Realtime**: Supabase Realtime + Socket.io (대결방)

### Infrastructure
- **Hosting**: Vercel
- **Database/Auth/Storage**: Supabase
- **Version Control**: GitHub

---

## 프로젝트 구조

```
paint-share/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # 인증 관련 페이지
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (main)/            # 메인 레이아웃
│   │   │   ├── feed/          # 그림 피드
│   │   │   ├── draw/          # 드로잉 페이지
│   │   │   ├── battle/        # 대결방
│   │   │   └── profile/       # 프로필
│   │   ├── api/               # API Routes
│   │   │   ├── paintings/
│   │   │   ├── topics/
│   │   │   ├── users/
│   │   │   └── battle/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                # 공통 UI 컴포넌트
│   │   ├── canvas/            # 캔버스 관련 컴포넌트
│   │   ├── feed/              # 피드 관련 컴포넌트
│   │   ├── battle/            # 대결방 관련 컴포넌트
│   │   └── layout/            # 레이아웃 컴포넌트
│   ├── hooks/                 # Custom Hooks
│   │   ├── useCanvas.ts
│   │   ├── useTimer.ts
│   │   ├── useBattle.ts
│   │   └── useAuth.ts
│   ├── lib/                   # 유틸리티 & 설정
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── socket/
│   │   └── utils/
│   ├── stores/                # Zustand 스토어
│   │   ├── authStore.ts
│   │   ├── canvasStore.ts
│   │   └── battleStore.ts
│   ├── types/                 # TypeScript 타입 정의
│   │   ├── database.ts
│   │   ├── canvas.ts
│   │   └── battle.ts
│   └── constants/             # 상수 정의
│       ├── topics.ts
│       └── config.ts
├── public/
│   ├── icons/
│   └── images/
├── supabase/
│   ├── migrations/            # DB 마이그레이션
│   └── seed.sql              # 초기 데이터
├── docs/                      # 문서
│   ├── API.md
│   ├── DATABASE.md
│   └── DEPLOYMENT.md
├── agents/                    # Claude Code 에이전트
├── commands/                  # Claude Code 커맨드
├── rules/                     # Claude Code 규칙
├── skills/                    # Claude Code 스킬
├── .env.local                 # 환경 변수 (gitignore)
├── .env.example               # 환경 변수 예시
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 데이터베이스 스키마

### users (Supabase Auth 확장)
```sql
-- profiles 테이블 (Supabase Auth users 확장)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### paintings
```sql
CREATE TABLE paintings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  topic VARCHAR(200) NOT NULL,
  time_limit INTEGER NOT NULL, -- 초 단위 (0 = 무제한)
  actual_time INTEGER, -- 실제 소요 시간
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  battle_id UUID REFERENCES battles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### likes
```sql
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  painting_id UUID REFERENCES paintings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, painting_id)
);
```

### comments
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  painting_id UUID REFERENCES paintings(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### follows
```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
```

### battles (대결방)
```sql
CREATE TABLE battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  topic VARCHAR(200),
  time_limit INTEGER NOT NULL,
  max_participants INTEGER DEFAULT 10,
  status VARCHAR(20) DEFAULT 'waiting', -- waiting, in_progress, finished
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);
```

### battle_participants
```sql
CREATE TABLE battle_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(battle_id, user_id)
);
```

### topics (랜덤 주제 풀)
```sql
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  difficulty VARCHAR(20) DEFAULT 'normal', -- easy, normal, hard
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 환경 변수

```env
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# WebSocket (Socket.io)
NEXT_PUBLIC_SOCKET_URL=your_socket_server_url
```

---

## 개발 가이드라인

### 코딩 컨벤션
- TypeScript strict mode 사용
- ESLint + Prettier 설정 준수
- 컴포넌트: PascalCase
- 함수/변수: camelCase
- 상수: UPPER_SNAKE_CASE
- 파일명: kebab-case (컴포넌트 제외)

### 컴포넌트 작성 규칙
```typescript
// 함수 컴포넌트 + TypeScript
interface Props {
  title: string;
  onClick?: () => void;
}

export function MyComponent({ title, onClick }: Props) {
  return (
    <div onClick={onClick}>
      {title}
    </div>
  );
}
```

### Git 커밋 컨벤션
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드 설정, 패키지 관리 등
```

### 브랜치 전략
- `main`: 프로덕션 배포
- `develop`: 개발 통합
- `feature/*`: 기능 개발
- `fix/*`: 버그 수정

---

## 개발 우선순위 (MVP)

### Phase 1: 기본 구조 (1주차)
- [x] 프로젝트 초기 설정
- [x] Supabase 연동
- [x] 인증 시스템 (로그인/회원가입)
- [x] 기본 레이아웃

### Phase 2: 핵심 기능 (2-3주차)
- [x] 캔버스 드로잉 툴
- [x] 타이머 시스템
- [ ] 랜덤 주제 생성
- [ ] 그림 저장 & 업로드 (Phase 3로 통합)

### Phase 3: SNS 기능 (4주차) ✅ 완료
- [x] 그림 업로드 및 저장 시스템
- [x] 프로필 페이지 (조회/수정/갤러리)
- [x] 피드 페이지 (최신/인기/팔로잉)
- [x] 좋아요 & 댓글 & 팔로우

### Phase 4: 실시간 대결방 (5-6주차) ✅ 주요 기능 완료
- [x] WebSocket 서버 설정 (Socket.io)
- [x] 대결방 생성/참가 로직
- [x] 실시간 채팅 & 이모티콘
- [x] 캔버스 실시간 스트리밍
- [x] 실시간 투표 & 순위 시스템
- [ ] 모바일 최적화 및 안정성 확보 (보류)

### Phase 5: 마무리 (7주차)
- [ ] UI/UX 개선
- [ ] 성능 최적화
- [ ] 테스트 & 버그 수정
- [ ] 배포

---

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start
```

---

## Linear 기반 남은 작업 조회 규칙

- 상태 우선순위: `In Progress` > `Todo` > `Backlog` > `Done` 순서로 확인한다.
- 우선 조회:
- `mcp__linear__list_issues`로 `team: "Paint-share", state: "In Progress"` 확인
- 결과가 없으면 `state: "Todo"` 확인
- 다음으로 `state: "Backlog"`에서 미처리 항목을 확인
- `High` 우선순위 필터링 시 제목/라벨에 `[HIGH]` 또는 label에 `high`가 포함된 항목을 우선 처리한다.
- 작업 착수 전, 해당 이슈가 `assignee: "me"`로 배정되어 있는지 확인하고, 없으면 `Backlog`에서 선택한다.

### 리니어 작업 가이드 (실행 순서)

1. `In Progress` 조회
   - `mcp__linear__list_issues` + `state: "In Progress"`, `team: "Paint-share"` 호출
   - 있으면 그 이슈를 우선 진행하고, 없다면 2번으로 이동
2. `Todo` 조회
   - `mcp__linear__list_issues` + `state: "Todo"`, `team: "Paint-share"` 호출
   - `assignee`가 비어 있거나 본인인 항목을 후보군으로 정리
3. `Backlog` 조회
   - `mcp__linear__list_issues` + `state: "Backlog"`, `team: "Paint-share"` 호출
   - High 우선(`PAI-*` 제목 또는 `[HIGH]`) 항목 먼저 분류
4. 작업 선택 규칙
   - 기본: `High` → `Medium` → `Low`
   - 같은 레벨에서는 최신 업데이트(`updatedAt`) 기준 최신 항목 우선
   - 중복/시스템 이슈(온보딩성 템플릿성 제목)는 제외
5. 착수 기록
   - 실제 실행할 이슈만 `assignee: "me"`로 지정
   - AGENTS 우선순위 규칙과 충돌하지 않으면 바로 `In Progress` 작업으로 전환
6. 완료 후 정리
   - 이슈 완료 시 `status` 전환과 함께 `AGENTS.md`의 다음 대상 큐를 재확인
   - `PAI-*` 식별자 기준으로 문서/리포트에 추적 포인트 기록

### 리니어 사용 가이드

- 기본 점검 순서
  - 팀 확인: `mcp__linear__list_teams`
  - 상태 확인: `mcp__linear__list_issue_statuses` (팀: `Paint-share`)
  - 현재 작업 확인: `mcp__linear__list_issues` (state: `In Progress`)
  - 후보군 조회: `Todo` → `Backlog`
- 필터링 규칙
  - 우선순위는 라벨 `High` 또는 제목 `[HIGH]`, 그 다음 `Medium`, `Low`
  - 시스템 기본 이슈(PAI-1~4 같은 온보딩 템플릿성)만 남겨두고 기능 백로그를 우선한다.
- 착수/이관 규칙
  - 작업 시작 전 `assignee`를 본인으로 정하고 진행
  - 필요한 경우에만 상태를 `In Progress`로 이동
  - 완료 후 `Done` 이동 및 링크/범위/결과를 작업 메모에 남긴다.
- 검색/조회 보조 규칙
  - 특정 이슈 상세 필요 시 `mcp__linear__get_issue`
  - 긴급 점검 시 `mcp__linear__list_issues`에 `query`로 키워드(예: `PAI-55`, `auth`, `socket`) 사용

### 작업 시 지켜야 할 스킬 기준

- Linear/워크플로우 작업
  - 이슈 조회·생성·상태 변경·리포트는 `linear` 스킬을 적용
- React/Next.js 코드/성능 변경
  - 새 컴포넌트 구조, 렌더링 최적화, 재사용 패턴 변경 시 `vercel-react-best-practices` + `vercel-composition-patterns`
- 모바일 UX/성능 최적화
  - 모바일 화면/터치/리스트 성능 이슈는 `vercel-react-native-skills`
- Supabase DB/쿼리/마이그레이션
  - 쿼리, 인덱스, 스키마 변경은 `supabase-postgres-best-practices`
- Web UI 점검(접근성/스타일/패턴)
  - UI 감사·리뷰 요청은 `web-design-guidelines`

## 참고 자료

- [Next.js 문서](https://nextjs.org/docs)
- [Supabase 문서](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [Socket.io](https://socket.io/docs/v4/)
- [Fabric.js](http://fabricjs.com/docs/)

## 작업 규칙 (Linear 우선) — 실행 계약

- 모든 개발 작업은 Linear 이슈 기반으로 수행한다.
- 시작 전: `In Progress` → `Todo` → `Backlog` 순으로 조회해 대상 이슈를 확정한다.
- 착수 규칙:
  - 대상 이슈를 `assignee: "me"`로 지정한다.
  - 대상 이슈를 `In Progress`로 변경한다.
- 진행 규칙:
  - 시작/중간/완료 지점마다 이슈 댓글을 남긴다.
  - 시작 댓글에는 목표, 범위, 대상 파일, 사용 스킬을 기재한다.
  - 완료 댓글에는 변경 파일, 결과, 미해결 리스크를 기재한다.
- 커밋 규칙:
  - 이슈별 작업 단위마다 커밋을 즉시 수행한다.
  - 메시지 형식: `feat|fix|refactor|docs|test|chore: ...`
- 스킬 규칙:
  - Linear/워크플로우: `linear`
  - React/Next.js: `vercel-react-best-practices`
  - 컴포넌트 구조/조합: `vercel-composition-patterns`
  - 모바일 성능: `vercel-react-native-skills`
  - Supabase/DB: `supabase-postgres-best-practices`
  - UI/접근성/디자인: `web-design-guidelines`
- 운영 스킬: `.agents/skills/linear-task-runbook/SKILL.md`를 항상 근거 스크립트로 사용한다.
