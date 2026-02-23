-- Tighten storage upload policies to enforce path ownership.

DROP POLICY IF EXISTS "Authenticated users can upload paintings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;

CREATE POLICY "Users can upload own paintings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'paintings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
