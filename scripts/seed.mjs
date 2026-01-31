import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env.local 파일 직접 파싱
function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  const env = {};

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const topics = [
  // Easy 난이도 주제
  { content: '사과', category: '음식', difficulty: 'easy' },
  { content: '바나나', category: '음식', difficulty: 'easy' },
  { content: '해', category: '자연', difficulty: 'easy' },
  { content: '달', category: '자연', difficulty: 'easy' },
  { content: '별', category: '자연', difficulty: 'easy' },
  { content: '하트', category: '사물', difficulty: 'easy' },
  { content: '나무', category: '자연', difficulty: 'easy' },
  { content: '꽃', category: '자연', difficulty: 'easy' },
  { content: '집', category: '사물', difficulty: 'easy' },
  { content: '자동차', category: '사물', difficulty: 'easy' },
  { content: '고양이', category: '동물', difficulty: 'easy' },
  { content: '강아지', category: '동물', difficulty: 'easy' },
  { content: '물고기', category: '동물', difficulty: 'easy' },
  { content: '새', category: '동물', difficulty: 'easy' },
  { content: '구름', category: '자연', difficulty: 'easy' },
  { content: '무지개', category: '자연', difficulty: 'easy' },
  { content: '눈사람', category: '사물', difficulty: 'easy' },
  { content: '우산', category: '사물', difficulty: 'easy' },
  { content: '컵', category: '사물', difficulty: 'easy' },
  { content: '책', category: '사물', difficulty: 'easy' },

  // Normal 난이도 주제
  { content: '피자 먹는 고양이', category: '판타지', difficulty: 'normal' },
  { content: '달 위의 토끼', category: '판타지', difficulty: 'normal' },
  { content: '하늘을 나는 펭귄', category: '판타지', difficulty: 'normal' },
  { content: '선글라스 쓴 해바라기', category: '판타지', difficulty: 'normal' },
  { content: '노래하는 개구리', category: '판타지', difficulty: 'normal' },
  { content: '케이크 위의 촛불', category: '음식', difficulty: 'normal' },
  { content: '물 위에 떠있는 종이배', category: '사물', difficulty: 'normal' },
  { content: '산 정상의 깃발', category: '자연', difficulty: 'normal' },
  { content: '밤하늘의 별똥별', category: '자연', difficulty: 'normal' },
  { content: '풍선을 든 아이', category: '일상', difficulty: 'normal' },
  { content: '커피 마시는 곰', category: '판타지', difficulty: 'normal' },
  { content: '기타 치는 문어', category: '판타지', difficulty: 'normal' },
  { content: '책 읽는 부엉이', category: '판타지', difficulty: 'normal' },
  { content: '요리하는 로봇', category: '판타지', difficulty: 'normal' },
  { content: '스케이트 타는 펭귄', category: '판타지', difficulty: 'normal' },
  { content: '서핑하는 고래', category: '판타지', difficulty: 'normal' },
  { content: '우주선과 외계인', category: '판타지', difficulty: 'normal' },
  { content: '정글 속 탐험가', category: '상황', difficulty: 'normal' },
  { content: '마법사의 모자', category: '판타지', difficulty: 'normal' },
  { content: '보물 상자', category: '사물', difficulty: 'normal' },

  // Hard 난이도 주제
  { content: '카페에서 공부하는 대학생의 피로함', category: '감정', difficulty: 'hard' },
  { content: '비 오는 날 창문 밖을 바라보는 고양이의 눈', category: '감정', difficulty: 'hard' },
  { content: '퇴근 후 텅 빈 지하철 안', category: '상황', difficulty: 'hard' },
  { content: '새벽 4시 편의점의 따뜻함', category: '감정', difficulty: 'hard' },
  { content: '첫눈 내리는 날 설레는 마음', category: '감정', difficulty: 'hard' },
  { content: '친구와 다툰 후의 허전함', category: '감정', difficulty: 'hard' },
  { content: '시험 끝난 후의 해방감', category: '감정', difficulty: 'hard' },
  { content: '오래된 사진첩을 넘기는 손', category: '감정', difficulty: 'hard' },
  { content: '할머니 집 부엌의 향기', category: '감정', difficulty: 'hard' },
  { content: '밤새 코딩하는 개발자의 눈', category: '감정', difficulty: 'hard' },
];

async function seed() {
  console.log('Seeding topics...');

  // 기존 데이터 확인
  const { count } = await supabase
    .from('topics')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) {
    console.log(`Topics table already has ${count} rows. Skipping seed.`);
    return;
  }

  const { data, error } = await supabase
    .from('topics')
    .insert(topics)
    .select();

  if (error) {
    console.error('Error seeding topics:', error);
    process.exit(1);
  }

  console.log(`Successfully seeded ${data.length} topics!`);
}

seed();
