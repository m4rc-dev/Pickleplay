ALTER TABLE security_settings
  ALTER COLUMN verification_code_expires_at TYPE TIMESTAMPTZ USING verification_code_expires_at AT TIME ZONE 'UTC',
  ALTER COLUMN verification_code_sent_at TYPE TIMESTAMPTZ USING verification_code_sent_at AT TIME ZONE 'UTC',
  ALTER COLUMN backup_codes_generated_at TYPE TIMESTAMPTZ USING backup_codes_generated_at AT TIME ZONE 'UTC',
  ALTER COLUMN last_backup_code_used_at TYPE TIMESTAMPTZ USING last_backup_code_used_at AT TIME ZONE 'UTC';

ALTER TABLE two_factor_auth_sessions
  ALTER COLUMN verified_at TYPE TIMESTAMPTZ USING verified_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE security_audit_logs
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
