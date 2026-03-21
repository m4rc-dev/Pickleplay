ALTER TABLE security_settings
  ADD COLUMN IF NOT EXISTS verification_code_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_purpose TEXT CHECK (verification_purpose IN ('login', 'setup')),
  ADD COLUMN IF NOT EXISTS backup_codes_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_backup_code_used_at TIMESTAMPTZ;

UPDATE security_settings
SET two_factor_method = 'email'
WHERE two_factor_enabled = TRUE
  AND COALESCE(two_factor_method, 'none') <> 'email';

UPDATE security_settings
SET two_factor_method = 'none'
WHERE COALESCE(two_factor_enabled, FALSE) = FALSE
  AND COALESCE(two_factor_method, 'none') <> 'none';

CREATE TABLE IF NOT EXISTS two_factor_auth_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_provider TEXT NOT NULL DEFAULT 'unknown',
  status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'exempt')),
  required BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_two_factor_auth_sessions_user_id
  ON two_factor_auth_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_two_factor_auth_sessions_status
  ON two_factor_auth_sessions(status);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_event_created
  ON security_audit_logs(user_id, event_type, created_at DESC);

CREATE OR REPLACE FUNCTION update_two_factor_auth_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS two_factor_auth_sessions_updated_at
  ON two_factor_auth_sessions;

CREATE TRIGGER two_factor_auth_sessions_updated_at
BEFORE UPDATE ON two_factor_auth_sessions
FOR EACH ROW
EXECUTE FUNCTION update_two_factor_auth_sessions_timestamp();

ALTER TABLE two_factor_auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own two factor auth sessions"
  ON two_factor_auth_sessions;

CREATE POLICY "Users can view their own two factor auth sessions"
  ON two_factor_auth_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own security audit logs"
  ON security_audit_logs;

CREATE POLICY "Users can view their own security audit logs"
  ON security_audit_logs FOR SELECT
  USING (auth.uid() = user_id);
