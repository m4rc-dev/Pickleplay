-- Phase 2: Create court_events table for court owner calendar management
-- Allows court owners to create events like maintenance, closures, private events
-- These events can block player bookings to prevent conflicts

-- Create court_events table
CREATE TABLE IF NOT EXISTS court_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('maintenance', 'private_event', 'cleaning', 'closure', 'other')),
  
  -- Determines if this event blocks player bookings
  blocks_bookings BOOLEAN DEFAULT TRUE,
  
  -- Color for UI calendar display
  color VARCHAR(7) DEFAULT '#ef4444', -- Tailwind red-500 by default
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_court FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE,
  CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT valid_datetime CHECK (end_datetime > start_datetime)
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_court_events_court_id ON court_events(court_id);
CREATE INDEX IF NOT EXISTS idx_court_events_owner_id ON court_events(owner_id);
CREATE INDEX IF NOT EXISTS idx_court_events_start_datetime ON court_events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_court_events_end_datetime ON court_events(end_datetime);
CREATE INDEX IF NOT EXISTS idx_court_events_court_start_end ON court_events(court_id, start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_court_events_blocks_bookings ON court_events(blocks_bookings) WHERE blocks_bookings = TRUE;

-- Create updated_at trigger for court_events
CREATE OR REPLACE FUNCTION update_court_events_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER court_events_timestamp_trigger
BEFORE UPDATE ON court_events
FOR EACH ROW
EXECUTE FUNCTION update_court_events_timestamp();

-- Create RLS (Row Level Security) policies for court_events
ALTER TABLE court_events ENABLE ROW LEVEL SECURITY;

-- Allow court owners to view their own events
CREATE POLICY "Users can view their court events"
  ON court_events
  FOR SELECT
  USING (owner_id = auth.uid());

-- Allow court owners to create events for their courts
CREATE POLICY "Users can create events for their courts"
  ON court_events
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM courts
      WHERE courts.id = court_id
      AND courts.owner_id = auth.uid()
    )
  );

-- Allow court owners to update their own events
CREATE POLICY "Users can update their own events"
  ON court_events
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Allow court owners to delete their own events
CREATE POLICY "Users can delete their own events"
  ON court_events
  FOR DELETE
  USING (owner_id = auth.uid());

-- Allow players to view court events (for calendar conflicts)
CREATE POLICY "Players can view blocking events for booking purposes"
  ON court_events
  FOR SELECT
  USING (blocks_bookings = TRUE);

-- Add comments for documentation
COMMENT ON TABLE court_events IS 'Stores court owner calendar events like maintenance, closures, and private events. Events can block player bookings.';
COMMENT ON COLUMN court_events.event_type IS 'Type of event: maintenance, private_event, cleaning, closure, or other';
COMMENT ON COLUMN court_events.blocks_bookings IS 'If TRUE, prevents players from booking during this time period';
COMMENT ON COLUMN court_events.color IS 'Hex color for UI calendar display';
