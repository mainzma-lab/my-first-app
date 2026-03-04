-- ============================================================
-- Extend customer_overview with overnight and daycare day totals
-- for the last 12 months
-- ============================================================

DROP VIEW IF EXISTS customer_overview;
CREATE VIEW customer_overview AS
SELECT
  c.*,
  (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = c.id AND b.booking_type = 'uebernachtung' AND b.status != 'storniert') AS total_bookings_pension,
  (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = c.id AND b.booking_type IN ('tagesbetreuung_flexibel', 'tagesbetreuung_regelmaessig') AND b.status != 'storniert') AS total_bookings_daycare,
  (SELECT MAX(b.end_date) FROM bookings b WHERE b.customer_id = c.id AND b.status IN ('aktiv', 'abgeschlossen')) AS last_stay_date,
  (SELECT COUNT(*) FROM dogs d WHERE d.customer_id = c.id) AS dog_count,
  NOT EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id = c.id AND b.status != 'storniert') AS is_new_customer,
  (SELECT MIN(b.start_date) FROM bookings b WHERE b.customer_id = c.id AND b.start_date >= CURRENT_DATE AND b.status IN ('geplant', 'aktiv')) AS next_booking_date,
  (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = c.id AND b.start_date >= CURRENT_DATE - INTERVAL '12 months' AND b.status != 'storniert') AS bookings_last_12_months,
  (SELECT COALESCE(SUM(b.duration_days), 0) FROM bookings b WHERE b.customer_id = c.id AND b.booking_type = 'uebernachtung' AND b.start_date >= CURRENT_DATE - INTERVAL '12 months' AND b.status != 'storniert') AS pension_days_last_12_months,
  (SELECT COALESCE(SUM(b.duration_days), 0) FROM bookings b WHERE b.customer_id = c.id AND b.booking_type IN ('tagesbetreuung_flexibel', 'tagesbetreuung_regelmaessig') AND b.start_date >= CURRENT_DATE - INTERVAL '12 months' AND b.status != 'storniert') AS daycare_days_last_12_months
FROM customers c;
