-- Add RLS policy to allow all authenticated users to view booking times
-- This is needed for availability checking to prevent double-bookings
-- Users can see when slots are booked (but only for active/pending bookings)

CREATE POLICY "Anyone can view booking availability"
  ON bookings
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    status IN ('pending', 'confirmed')
  );

-- Add comment for documentation
COMMENT ON POLICY "Anyone can view booking availability" ON bookings 
IS 'Allows all authenticated users to see booking times for availability checking. Only shows active bookings (pending/confirmed) to prevent double-booking conflicts.';
