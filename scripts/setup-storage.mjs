import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

async function setupStorage() {
  console.log('Setting up storage buckets...');

  // paintings 버킷 생성 (그림 이미지 저장용)
  const { data: paintingsBucket, error: paintingsError } = await supabase.storage.createBucket('paintings', {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  });

  if (paintingsError) {
    if (paintingsError.message.includes('already exists')) {
      console.log('paintings bucket already exists');
    } else {
      console.error('Error creating paintings bucket:', paintingsError);
    }
  } else {
    console.log('Created paintings bucket');
  }

  // avatars 버킷 생성 (프로필 이미지 저장용)
  const { data: avatarsBucket, error: avatarsError } = await supabase.storage.createBucket('avatars', {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  });

  if (avatarsError) {
    if (avatarsError.message.includes('already exists')) {
      console.log('avatars bucket already exists');
    } else {
      console.error('Error creating avatars bucket:', avatarsError);
    }
  } else {
    console.log('Created avatars bucket');
  }

  console.log('Storage setup complete!');
}

setupStorage();
