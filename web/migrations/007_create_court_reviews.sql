-- Create Court Reviews Table
CREATE TABLE IF NOT EXISTS public.court_reviews (
  id uuid not null default gen_random_uuid (),
  court_id uuid not null,
  user_id uuid not null,
  booking_id uuid not null,
  rating integer not null,
  comment text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint court_reviews_pkey primary key (id),
  constraint unique_booking_review unique (booking_id, user_id),
  constraint court_reviews_booking_id_fkey foreign KEY (booking_id) references bookings (id) on delete CASCADE,
  constraint court_reviews_court_id_fkey foreign KEY (court_id) references courts (id) on delete CASCADE,
  constraint court_reviews_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE,
  constraint court_reviews_rating_check check (
    (
      (rating >= 1)
      and (rating <= 5)
    )
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_court_reviews_court_id on public.court_reviews (court_id);
CREATE INDEX IF NOT EXISTS idx_court_reviews_user_id on public.court_reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_court_reviews_booking_id on public.court_reviews (booking_id);

-- Update Timestamp Trigger Function
CREATE OR REPLACE FUNCTION update_court_reviews_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS court_reviews_timestamp_trigger ON court_reviews;
CREATE TRIGGER court_reviews_timestamp_trigger 
BEFORE UPDATE ON court_reviews 
FOR EACH ROW
EXECUTE FUNCTION update_court_reviews_timestamp();

-- RLS Policies
ALTER TABLE court_reviews ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view reviews
CREATE POLICY "Public reviews are viewable by everyone" 
ON court_reviews FOR SELECT 
USING (true);

-- Allow authenticated users to insert their own reviews
CREATE POLICY "Users can create reviews for their own bookings" 
ON court_reviews FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own reviews
CREATE POLICY "Users can update their own reviews" 
ON court_reviews FOR UPDATE 
USING (auth.uid() = user_id);
