-- Add frequency column to bookings for tagesbetreuung_regelmaessig pricing
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS frequency frequency_type;
