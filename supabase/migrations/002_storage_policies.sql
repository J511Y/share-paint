-- Storage RLS 정책 설정

-- paintings 버킷 정책
-- 모든 사용자가 paintings 버킷의 이미지를 볼 수 있음
CREATE POLICY "Anyone can view paintings"
ON storage.objects FOR SELECT
USING (bucket_id = 'paintings');

-- 인증된 사용자만 paintings 버킷에 업로드 가능
CREATE POLICY "Authenticated users can upload paintings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'paintings'
  AND auth.role() = 'authenticated'
);

-- 자신의 paintings만 삭제 가능 (파일 경로가 user_id로 시작)
CREATE POLICY "Users can delete own paintings"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'paintings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- avatars 버킷 정책
-- 모든 사용자가 avatars 버킷의 이미지를 볼 수 있음
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 인증된 사용자만 avatars 버킷에 업로드 가능
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);

-- 자신의 avatars만 삭제/수정 가능
CREATE POLICY "Users can manage own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
