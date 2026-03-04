-- ============================================================
-- CRM Hundepension Schmidt — Supabase Migration
-- Version: 1.0
-- Datum: 03.03.2026
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. CUSTOM TYPES (ENUMS)
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'mitarbeiter');

CREATE TYPE salutation_type AS ENUM ('Herr', 'Frau', 'Divers');

CREATE TYPE customer_status AS ENUM (
  'im_prozess',
  'tel_nicht_erreicht',
  'buchung_bestaetigt',
  'neukunde_gewonnen',
  'absage_kunde',
  'absage_gudrun',
  'termin_geaendert',
  'storniert'
);

CREATE TYPE dog_gender AS ENUM ('maennlich', 'weiblich');

CREATE TYPE document_type AS ENUM ('impfpass', 'haftpflicht');

CREATE TYPE allowed_mime_type AS ENUM ('image/jpeg', 'image/png', 'application/pdf');

CREATE TYPE kennel_size AS ENUM ('S', 'M', 'L');

CREATE TYPE hatch_status AS ENUM ('ja', 'nein', 'in_planung');

CREATE TYPE booking_type AS ENUM (
  'uebernachtung',
  'tagesbetreuung_flexibel',
  'tagesbetreuung_regelmaessig'
);

CREATE TYPE booking_status AS ENUM ('geplant', 'aktiv', 'abgeschlossen', 'storniert');

CREATE TYPE service_type AS ENUM (
  'uebernachtung',
  'tagesbetreuung_flexibel',
  'tagesbetreuung_regelmaessig'
);

CREATE TYPE frequency_type AS ENUM ('1x_woche', '2x_woche');

CREATE TYPE waitlist_status AS ENUM ('wartend', 'kontaktiert', 'gebucht', 'abgesagt');

CREATE TYPE consent_type AS ENUM ('newsletter', 'datenverarbeitung');

CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete');

-- ============================================================
-- 3. TABLES
-- ============================================================

-- 3.1 Users (Benutzer)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'mitarbeiter',
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 Customers (Kunden)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salutation salutation_type NOT NULL,
  first_name_1 TEXT NOT NULL,
  last_name_1 TEXT NOT NULL,
  first_name_2 TEXT,
  last_name_2 TEXT,
  street TEXT NOT NULL,
  zip TEXT NOT NULL,
  city TEXT NOT NULL,
  mobile_phone TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  customer_since DATE,
  referral_source TEXT,
  newsletter_consent BOOLEAN NOT NULL DEFAULT FALSE,
  newsletter_consent_date TIMESTAMPTZ,
  status customer_status NOT NULL DEFAULT 'im_prozess',
  status_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 3.3 Dogs (Hunde)
CREATE TABLE dogs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  breed TEXT NOT NULL,
  birth_date DATE NOT NULL,
  gender dog_gender NOT NULL,
  is_neutered BOOLEAN NOT NULL DEFAULT FALSE,
  behavioral_notes TEXT,
  compatibility_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 Dog Documents (Hunde-Dokumente)
CREATE TABLE dog_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes <= 10485760),
  mime_type allowed_mime_type NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id)
);

-- 3.5 Kennels (Zwinger)
CREATE TABLE kennels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number INTEGER UNIQUE NOT NULL CHECK (number >= 1 AND number <= 30),
  size kennel_size NOT NULL,
  has_heating BOOLEAN NOT NULL DEFAULT FALSE,
  hatch_status hatch_status NOT NULL DEFAULT 'nein',
  special_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.6 Bookings (Buchungen)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  booking_type booking_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
  total_price DECIMAL(10,2),
  medication_notes TEXT,
  medication_schedule TEXT,
  items_list TEXT,
  notes TEXT,
  status booking_status NOT NULL DEFAULT 'geplant',
  cancellation_date DATE,
  cancellation_fee DECIMAL(10,2),
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- 3.7 Booking Dogs (Buchung-Hunde-Zuordnung)
CREATE TABLE booking_dogs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES dogs(id),
  UNIQUE(booking_id, dog_id)
);

-- 3.8 Booking Kennels (Buchung-Zwinger-Zuordnung)
CREATE TABLE booking_kennels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  kennel_id UUID NOT NULL REFERENCES kennels(id),
  UNIQUE(booking_id, kennel_id)
);

-- 3.9 Prices (Preise)
CREATE TABLE prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_type service_type NOT NULL,
  dog_count INTEGER NOT NULL CHECK (dog_count IN (1, 2)),
  frequency frequency_type,
  price_amount DECIMAL(10,2) NOT NULL,
  is_monthly BOOLEAN NOT NULL DEFAULT FALSE,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_price_dates CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

-- 3.10 Waitlist (Warteliste)
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  desired_start_date DATE NOT NULL,
  desired_end_date DATE NOT NULL,
  number_of_dogs INTEGER NOT NULL CHECK (number_of_dogs >= 1 AND number_of_dogs <= 4),
  booking_type booking_type NOT NULL,
  notes TEXT,
  status waitlist_status NOT NULL DEFAULT 'wartend',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  CONSTRAINT valid_waitlist_dates CHECK (desired_end_date >= desired_start_date)
);

-- 3.11 GDPR Consent Log (DSGVO-Einwilligungsprotokoll)
CREATE TABLE gdpr_consent_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  consent_type consent_type NOT NULL,
  consented BOOLEAN NOT NULL,
  consent_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.12 Audit Log (Änderungsprotokoll)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. INDEXES
-- ============================================================

-- Customers
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_last_name ON customers(last_name_1);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_search ON customers USING gin(
  to_tsvector('german', coalesce(first_name_1, '') || ' ' || coalesce(last_name_1, '') || ' ' || coalesce(email, ''))
);

-- Dogs
CREATE INDEX idx_dogs_customer_id ON dogs(customer_id);

-- Dog Documents
CREATE INDEX idx_dog_documents_dog_id ON dog_documents(dog_id);

-- Bookings
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX idx_bookings_start_date ON bookings(start_date);
CREATE INDEX idx_bookings_end_date ON bookings(end_date);

-- Booking Dogs
CREATE INDEX idx_booking_dogs_booking_id ON booking_dogs(booking_id);
CREATE INDEX idx_booking_dogs_dog_id ON booking_dogs(dog_id);

-- Booking Kennels
CREATE INDEX idx_booking_kennels_booking_id ON booking_kennels(booking_id);
CREATE INDEX idx_booking_kennels_kennel_id ON booking_kennels(kennel_id);

-- Prices
CREATE INDEX idx_prices_service_type ON prices(service_type);
CREATE INDEX idx_prices_valid ON prices(valid_from, valid_to);

-- Waitlist
CREATE INDEX idx_waitlist_status ON waitlist(status);
CREATE INDEX idx_waitlist_dates ON waitlist(desired_start_date, desired_end_date);

-- Audit Log
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================================
-- 5. FUNCTIONS
-- ============================================================

-- 5.1 Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.2 Berechne Stornierungsgebühr
CREATE OR REPLACE FUNCTION calculate_cancellation_fee(
  p_total_price DECIMAL,
  p_start_date DATE,
  p_cancellation_date DATE
) RETURNS DECIMAL AS $$
DECLARE
  days_before INTEGER;
  fee_percentage DECIMAL;
BEGIN
  -- Tag des Stornierungseingangs wird mitgezählt, start_date nicht
  days_before := p_start_date - p_cancellation_date;

  IF days_before > 30 THEN
    fee_percentage := 0;
  ELSIF days_before >= 15 THEN
    fee_percentage := 0.25;
  ELSIF days_before >= 7 THEN
    fee_percentage := 0.50;
  ELSIF days_before >= 3 THEN
    fee_percentage := 0.75;
  ELSE
    fee_percentage := 1.00;
  END IF;

  RETURN ROUND(p_total_price * fee_percentage, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5.3 Prüfe Zwinger-Verfügbarkeit
CREATE OR REPLACE FUNCTION check_kennel_availability(
  p_kennel_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM booking_kennels bk
    JOIN bookings b ON b.id = bk.booking_id
    WHERE bk.kennel_id = p_kennel_id
      AND b.status != 'storniert'
      AND b.start_date <= p_end_date
      AND b.end_date >= p_start_date
      AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 5.4 Berechne Tagespreis (aktuell gültigen Preis holen)
CREATE OR REPLACE FUNCTION get_current_price(
  p_service_type service_type,
  p_dog_count INTEGER,
  p_frequency frequency_type DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL AS $$
DECLARE
  result DECIMAL;
BEGIN
  SELECT price_amount INTO result
  FROM prices
  WHERE service_type = p_service_type
    AND dog_count = p_dog_count
    AND (frequency IS NOT DISTINCT FROM p_frequency)
    AND valid_from <= p_date
    AND (valid_to IS NULL OR valid_to >= p_date)
  ORDER BY valid_from DESC
  LIMIT 1;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5.5 Berechne Buchungspreis
CREATE OR REPLACE FUNCTION calculate_booking_price(
  p_booking_type booking_type,
  p_start_date DATE,
  p_end_date DATE,
  p_dog_count INTEGER,
  p_frequency frequency_type DEFAULT NULL
) RETURNS DECIMAL AS $$
DECLARE
  daily_price DECIMAL;
  duration INTEGER;
BEGIN
  IF p_booking_type = 'tagesbetreuung_regelmaessig' THEN
    -- Monatspreis: direkt zurückgeben
    RETURN get_current_price(p_booking_type::service_type, p_dog_count, p_frequency);
  ELSE
    -- Tages- oder Übernachtungspreis
    daily_price := get_current_price(p_booking_type::service_type, p_dog_count);
    duration := p_end_date - p_start_date + 1;
    RETURN ROUND(daily_price * duration, 2);
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5.6 Zähle Hunde pro Kunde (max 4)
CREATE OR REPLACE FUNCTION check_max_dogs_per_customer()
RETURNS TRIGGER AS $$
DECLARE
  dog_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dog_count
  FROM dogs
  WHERE customer_id = NEW.customer_id;

  IF dog_count >= 4 THEN
    RAISE EXCEPTION 'Maximal 4 Hunde pro Kunde erlaubt';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.7 Prüfe: Nur Hunde des gebuchten Kunden
CREATE OR REPLACE FUNCTION check_booking_dog_ownership()
RETURNS TRIGGER AS $$
DECLARE
  booking_customer_id UUID;
  dog_customer_id UUID;
BEGIN
  SELECT customer_id INTO booking_customer_id FROM bookings WHERE id = NEW.booking_id;
  SELECT customer_id INTO dog_customer_id FROM dogs WHERE id = NEW.dog_id;

  IF booking_customer_id != dog_customer_id THEN
    RAISE EXCEPTION 'Hund gehört nicht zum gebuchten Kunden';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.8 Auto-setze customer_since bei erster Buchung
CREATE OR REPLACE FUNCTION update_customer_since()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers
  SET customer_since = NEW.start_date
  WHERE id = NEW.customer_id
    AND customer_since IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_dogs_updated_at
  BEFORE UPDATE ON dogs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Max 4 Hunde pro Kunde
CREATE TRIGGER trg_check_max_dogs
  BEFORE INSERT ON dogs
  FOR EACH ROW EXECUTE FUNCTION check_max_dogs_per_customer();

-- Nur Hunde des gebuchten Kunden
CREATE TRIGGER trg_check_booking_dog_ownership
  BEFORE INSERT OR UPDATE ON booking_dogs
  FOR EACH ROW EXECUTE FUNCTION check_booking_dog_ownership();

-- Auto customer_since
CREATE TRIGGER trg_update_customer_since
  AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_customer_since();

-- ============================================================
-- 7. VIEWS (für berechnete Felder)
-- ============================================================

-- Kunden-Übersicht mit berechneten Feldern
CREATE OR REPLACE VIEW customer_overview AS
SELECT
  c.*,
  (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = c.id AND b.booking_type = 'uebernachtung' AND b.status != 'storniert') AS total_bookings_pension,
  (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = c.id AND b.booking_type IN ('tagesbetreuung_flexibel', 'tagesbetreuung_regelmaessig') AND b.status != 'storniert') AS total_bookings_daycare,
  (SELECT MAX(b.end_date) FROM bookings b WHERE b.customer_id = c.id AND b.status IN ('aktiv', 'abgeschlossen')) AS last_stay_date,
  (SELECT COUNT(*) FROM dogs d WHERE d.customer_id = c.id) AS dog_count,
  NOT EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id = c.id AND b.status != 'storniert') AS is_new_customer
FROM customers c;

-- Zwinger-Tagesbelegung
CREATE OR REPLACE VIEW kennel_occupancy_today AS
SELECT
  k.id AS kennel_id,
  k.number AS kennel_number,
  k.size,
  k.has_heating,
  k.hatch_status,
  k.is_active,
  k.special_note,
  b.id AS booking_id,
  b.customer_id,
  b.start_date,
  b.end_date,
  b.status AS booking_status,
  c.first_name_1 || ' ' || c.last_name_1 AS customer_name
FROM kennels k
LEFT JOIN booking_kennels bk ON bk.kennel_id = k.id
LEFT JOIN bookings b ON b.id = bk.booking_id
  AND b.start_date <= CURRENT_DATE
  AND b.end_date >= CURRENT_DATE
  AND b.status IN ('geplant', 'aktiv')
LEFT JOIN customers c ON c.id = b.customer_id
ORDER BY k.number;

-- Dashboard: Heute/Morgen Ankünfte & Abholungen
CREATE OR REPLACE VIEW dashboard_arrivals_departures AS
SELECT
  b.id AS booking_id,
  b.start_date,
  b.end_date,
  b.booking_type,
  c.id AS customer_id,
  c.first_name_1 || ' ' || c.last_name_1 AS customer_name,
  c.mobile_phone,
  d.name AS dog_name,
  k.number AS kennel_number,
  CASE
    WHEN b.start_date = CURRENT_DATE THEN 'ankunft_heute'
    WHEN b.start_date = CURRENT_DATE + 1 THEN 'ankunft_morgen'
    WHEN b.end_date = CURRENT_DATE THEN 'abholung_heute'
    WHEN b.end_date = CURRENT_DATE + 1 THEN 'abholung_morgen'
  END AS event_type
FROM bookings b
JOIN customers c ON c.id = b.customer_id
JOIN booking_dogs bd ON bd.booking_id = b.id
JOIN dogs d ON d.id = bd.dog_id
LEFT JOIN booking_kennels bk ON bk.booking_id = b.id
LEFT JOIN kennels k ON k.id = bk.kennel_id
WHERE b.status IN ('geplant', 'aktiv')
  AND (
    b.start_date IN (CURRENT_DATE, CURRENT_DATE + 1)
    OR b.end_date IN (CURRENT_DATE, CURRENT_DATE + 1)
  );

-- Auslastungsquote
CREATE OR REPLACE VIEW kennel_utilization AS
SELECT
  k.id AS kennel_id,
  k.number AS kennel_number,
  k.size,
  COUNT(DISTINCT b.id) AS total_bookings,
  SUM(CASE WHEN b.id IS NOT NULL THEN b.end_date - b.start_date + 1 ELSE 0 END) AS total_booked_days
FROM kennels k
LEFT JOIN booking_kennels bk ON bk.kennel_id = k.id
LEFT JOIN bookings b ON b.id = bk.booking_id AND b.status != 'storniert'
WHERE k.is_active = TRUE
GROUP BY k.id, k.number, k.size
ORDER BY k.number;

-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dog_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kennels ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_kennels ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Alle eingeloggten Nutzer dürfen alles lesen und schreiben
-- (Admin + Mitarbeiter haben gleiche Rechte auf Daten)

CREATE POLICY "Authenticated users can read all" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read all" ON customers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON customers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON customers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read all" ON dogs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON dogs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON dogs
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON dogs
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read all" ON dog_documents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON dog_documents
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON dog_documents
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read all" ON kennels
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update" ON kennels
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read all" ON bookings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON bookings
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON bookings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read all" ON booking_dogs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON booking_dogs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON booking_dogs
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read all" ON booking_kennels
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON booking_kennels
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON booking_kennels
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON booking_kennels
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read all" ON prices
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON prices
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON prices
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read all" ON waitlist
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON waitlist
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON waitlist
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read all" ON gdpr_consent_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON gdpr_consent_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Audit Log: nur Admins lesen, alle schreiben
CREATE POLICY "Admins can read audit log" ON audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Authenticated users can insert audit log" ON audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Users: nur Admins können andere User verwalten
CREATE POLICY "Admins can manage users" ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 9. SEED DATA — Zwinger
-- ============================================================

INSERT INTO kennels (number, size, has_heating, hatch_status, special_note, is_active) VALUES
  (1,  'M', FALSE, 'ja',         NULL,                 TRUE),
  (2,  'M', FALSE, 'ja',         NULL,                 TRUE),
  (3,  'M', FALSE, 'ja',         NULL,                 TRUE),
  (4,  'M', FALSE, 'ja',         NULL,                 TRUE),
  (5,  'M', FALSE, 'ja',         NULL,                 TRUE),
  (6,  'L', TRUE,  'ja',         NULL,                 TRUE),
  (7,  'L', FALSE, 'ja',         NULL,                 TRUE),
  (8,  'L', FALSE, 'ja',         NULL,                 TRUE),
  (9,  'L', TRUE,  'ja',         NULL,                 TRUE),
  (10, 'L', TRUE,  'in_planung', NULL,                 TRUE),
  (11, 'L', FALSE, 'in_planung', NULL,                 TRUE),
  (12, 'M', FALSE, 'nein',       NULL,                 TRUE),
  (13, 'M', FALSE, 'nein',       NULL,                 TRUE),
  (14, 'S', FALSE, 'nein',       NULL,                 TRUE),
  (15, 'S', TRUE,  'nein',       NULL,                 TRUE),
  (16, 'M', TRUE,  'nein',       NULL,                 TRUE),
  (17, 'M', TRUE,  'nein',       NULL,                 TRUE),
  (18, 'M', TRUE,  'nein',       NULL,                 TRUE),
  (19, 'M', TRUE,  'nein',       NULL,                 TRUE),
  (20, 'M', FALSE, 'nein',       'Abstellzwinger',     FALSE),
  (21, 'M', TRUE,  'nein',       NULL,                 TRUE),
  (22, 'M', FALSE, 'nein',       NULL,                 TRUE),
  (23, 'M', FALSE, 'nein',       NULL,                 TRUE),
  (24, 'M', FALSE, 'nein',       NULL,                 TRUE),
  (25, 'M', FALSE, 'nein',       NULL,                 TRUE),
  (26, 'M', FALSE, 'nein',       NULL,                 TRUE),
  (27, 'M', FALSE, 'nein',       NULL,                 TRUE),
  (28, 'M', FALSE, 'nein',       NULL,                 TRUE),
  (29, 'M', FALSE, 'nein',       NULL,                 TRUE),
  (30, 'M', FALSE, 'nein',       'Lager für Decken',   FALSE);

-- ============================================================
-- 10. SEED DATA — Initiale Preise
-- ============================================================

INSERT INTO prices (service_type, dog_count, frequency, price_amount, is_monthly, valid_from) VALUES
  ('uebernachtung',              1, NULL,       38.00,  FALSE, '2026-01-01'),
  ('uebernachtung',              2, NULL,       58.00,  FALSE, '2026-01-01'),
  ('tagesbetreuung_flexibel',    1, NULL,       30.00,  FALSE, '2026-01-01'),
  ('tagesbetreuung_flexibel',    2, NULL,       40.00,  FALSE, '2026-01-01'),
  ('tagesbetreuung_regelmaessig', 1, '1x_woche', 115.00, TRUE, '2026-01-01'),
  ('tagesbetreuung_regelmaessig', 1, '2x_woche', 225.00, TRUE, '2026-01-01');
  -- Preise für regelmäßige Tagesbetreuung (2 Hunde) müssen noch festgelegt werden:
  -- ('tagesbetreuung_regelmaessig', 2, '1x_woche', ???, TRUE, '2026-01-01'),
  -- ('tagesbetreuung_regelmaessig', 2, '2x_woche', ???, TRUE, '2026-01-01');

-- ============================================================
-- 11. STORAGE BUCKET für Hundedokumente
-- ============================================================

-- In Supabase Dashboard erstellen oder via API:
-- Bucket: dog-documents
-- Public: false
-- File size limit: 10485760 (10 MB)
-- Allowed MIME types: image/jpeg, image/png, application/pdf

-- Storage Policies (in Supabase SQL Editor):
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dog-documents',
  'dog-documents',
  FALSE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dog-documents');

CREATE POLICY "Authenticated users can read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'dog-documents');

CREATE POLICY "Authenticated users can delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'dog-documents');
