-- Storage RLS Policies for item-images and avatars buckets
-- This file contains the RLS policies needed for secure storage access

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- item-images bucket policies
-- Allow public read access to all item images
DROP POLICY IF EXISTS "item_images_public_read" ON storage.objects;
CREATE POLICY "item_images_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'item-images');

-- Allow authenticated users to upload images to their own folder
DROP POLICY IF EXISTS "item_images_authenticated_upload" ON storage.objects;
CREATE POLICY "item_images_authenticated_upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'item-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own images
DROP POLICY IF EXISTS "item_images_authenticated_update" ON storage.objects;
CREATE POLICY "item_images_authenticated_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'item-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own images
DROP POLICY IF EXISTS "item_images_authenticated_delete" ON storage.objects;
CREATE POLICY "item_images_authenticated_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'item-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- avatars bucket policies
-- Allow public read access to all avatars
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
DROP POLICY IF EXISTS "avatars_authenticated_upload" ON storage.objects;
CREATE POLICY "avatars_authenticated_upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatar
DROP POLICY IF EXISTS "avatars_authenticated_update" ON storage.objects;
CREATE POLICY "avatars_authenticated_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatar
DROP POLICY IF EXISTS "avatars_authenticated_delete" ON storage.objects;
CREATE POLICY "avatars_authenticated_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);