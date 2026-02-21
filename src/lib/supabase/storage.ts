import { createClient } from './client';

/**
 * Data URL을 Blob으로 변환
 */
export function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}

/**
 * 이미지를 Supabase Storage에 업로드
 * @param dataUrl 이미지 Data URL
 * @param bucket 버킷 이름 (기본값: 'paintings')
 * @param path 파일 경로 (옵션)
 * @returns 업로드된 이미지의 공개 URL
 */
export async function uploadImage(
  dataUrl: string,
  bucket: string = 'paintings',
  userId: string
): Promise<string | null> {
  const supabase = createClient();
  const blob = dataURLtoBlob(dataUrl);
  
  // 파일명 생성 (timestamp_random.png)
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const fileName = `${userId}/${timestamp}_${random}.png`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, blob, {
      contentType: 'image/png',
      upsert: false,
    });

  if (error) {
    console.error('Image upload failed:', error);
    return null;
  }

  // 공개 URL 가져오기
  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}
