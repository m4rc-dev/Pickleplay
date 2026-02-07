-- Add password_set_at column to security_settings
ALTER TABLE security_settings
ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ;

-- Add comment  
COMMENT ON COLUMN security_settings.password_set_at IS 'Timestamp when user first set a password (for Google OAuth users who added password)';
