-- ============================================================
-- CRM Phase 3: Kundenverwaltung
-- - Add 'probebesuch' to customer_status enum
-- - Add is_manually_inactive column to customers
-- - Create system_settings table with inactivity threshold
-- ============================================================

-- 1. Add probebesuch status
ALTER TYPE customer_status ADD VALUE IF NOT EXISTS 'probebesuch' AFTER 'im_prozess';

-- 2. Manual inactivity flag
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_manually_inactive BOOLEAN NOT NULL DEFAULT false;

-- 3. System settings (key-value store for admin-configurable values)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default: 9 months inactivity threshold
INSERT INTO system_settings (key, value)
VALUES ('inactivity_threshold_months', '9')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read settings" ON system_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update settings" ON system_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
