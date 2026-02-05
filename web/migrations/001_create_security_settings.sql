-- Phase 1: Create security_settings and sessions tables
-- This migration separates security concerns from user profiles

-- Create security_settings table
CREATE TABLE IF NOT EXISTS security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_method TEXT CHECK (two_factor_method IN ('email', 'none')) DEFAULT 'none',
  two_factor_secret TEXT, -- Store encrypted 2FA secret for future use
  backup_codes JSON, -- Array of encrypted backup codes
  last_2fa_used TIMESTAMP,
  
  -- Email verification codes
  verification_code TEXT, -- Temporary 6-digit code
  verification_code_expires_at TIMESTAMP,
  verification_attempts INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_security_settings_user_id ON security_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id_active ON sessions(user_id, is_active);

-- Create updated_at trigger for security_settings
CREATE OR REPLACE FUNCTION update_security_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER security_settings_updated_at
BEFORE UPDATE ON security_settings
FOR EACH ROW
EXECUTE FUNCTION update_security_settings_timestamp();

-- Enable RLS (Row Level Security)
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_settings
CREATE POLICY "Users can view their own security settings"
  ON security_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own security settings"
  ON security_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own security settings"
  ON security_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for sessions
CREATE POLICY "Users can view their own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Initialize security_settings for existing users
INSERT INTO security_settings (user_id, two_factor_enabled)
SELECT id, false FROM auth.users
WHERE id NOT IN (SELECT user_id FROM security_settings)
ON CONFLICT (user_id) DO NOTHING;
