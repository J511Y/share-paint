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
- [ ] 그림 저장 & 업로드

### Phase 3: SNS 기능 (4주차)
- [ ] 피드 페이지
- [ ] 좋아요 & 댓글
- [ ] 프로필 페이지
- [ ] 팔로우 시스템

### Phase 4: 실시간 대결방 (5-6주차) 🚀 핵심 개발 중
- [x] WebSocket 서버 설정 (Socket.io)
- [x] 대결방 생성/참가 로직
- [x] 실시간 채팅
- [x] 캔버스 실시간 스트리밍 (기본 구현 완료, 최적화 예정)
- [x] 실시간 투표 & 순위 시스템
- [ ] 모바일 최적화 및 안정성 확보

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

## 참고 자료

- [Next.js 문서](https://nextjs.org/docs)
- [Supabase 문서](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [Socket.io](https://socket.io/docs/v4/)
- [Fabric.js](http://fabricjs.com/docs/)
