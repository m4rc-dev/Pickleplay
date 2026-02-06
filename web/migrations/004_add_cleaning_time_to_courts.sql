-- Add cleaning/buffer time field to courts table
-- Allows court owners to set a mandatory buffer between bookings for cleaning

-- Add cleaning_time_minutes column to courts
ALTER TABLE courts 
ADD COLUMN IF NOT EXISTS cleaning_time_minutes INTEGER DEFAULT 0;

-- Add constraint to ensure reasonable cleaning times (0-60 minutes)
ALTER TABLE courts
ADD CONSTRAINT valid_cleaning_time CHECK (cleaning_time_minutes >= 0 AND cleaning_time_minutes <= 60);

-- Add comment for documentation
COMMENT ON COLUMN courts.cleaning_time_minutes IS 'Buffer time in minutes between bookings for cleaning and preparation. Default 0 (no buffer). Court owners can set this to automatically block time after each booking.';
