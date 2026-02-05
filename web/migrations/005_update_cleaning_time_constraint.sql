-- Update cleaning_time_minutes constraint to allow up to 12 hours (720 minutes)

-- Drop the old constraint
ALTER TABLE courts DROP CONSTRAINT IF EXISTS valid_cleaning_time;

-- Add new constraint allowing 0 to 720 minutes (12 hours)
ALTER TABLE courts ADD CONSTRAINT valid_cleaning_time 
CHECK (cleaning_time_minutes >= 0 AND cleaning_time_minutes <= 720);
