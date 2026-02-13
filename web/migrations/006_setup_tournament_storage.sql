-- 1. Create the tournaments bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('tournaments', 'tournaments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow public access to view posters
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access'
    ) THEN
        CREATE POLICY "Public Access"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'tournaments');
    END IF;
END $$;

-- 3. Allow authenticated users to upload posters to their own directory
-- Path pattern: posters/USER_ID/filename
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Insert Tournament Posters'
    ) THEN
        CREATE POLICY "Insert Tournament Posters"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'tournaments' AND 
          (storage.foldername(name))[1] = 'posters' AND
          (storage.foldername(name))[2] = auth.uid()::text
        );
    END IF;
END $$;

-- 4. Allow authenticated users to update their own posters
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Update Tournament Posters'
    ) THEN
        CREATE POLICY "Update Tournament Posters"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (
          bucket_id = 'tournaments' AND 
          (storage.foldername(name))[1] = 'posters' AND
          (storage.foldername(name))[2] = auth.uid()::text
        );
    END IF;
END $$;

-- 5. Allow authenticated users to delete their own posters
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Delete Tournament Posters'
    ) THEN
        CREATE POLICY "Delete Tournament Posters"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (
          bucket_id = 'tournaments' AND 
          (storage.foldername(name))[1] = 'posters' AND
          (storage.foldername(name))[2] = auth.uid()::text
        );
    END IF;
END $$;
