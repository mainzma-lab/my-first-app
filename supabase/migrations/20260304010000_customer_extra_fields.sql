-- ============================================================
-- Customer extra fields:
-- - Second contact (email, mobile, salutation for Person 2)
-- - Google review tracking
-- ============================================================

-- Second contact info
ALTER TABLE customers ADD COLUMN IF NOT EXISTS second_email TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS second_mobile_phone TEXT;

-- Person 2 salutation
ALTER TABLE customers ADD COLUMN IF NOT EXISTS salutation_2 salutation_type;

-- Google review
ALTER TABLE customers ADD COLUMN IF NOT EXISTS has_google_review BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS google_review_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS google_review_stars SMALLINT CHECK (google_review_stars BETWEEN 1 AND 5);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS google_review_text TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS google_review_link TEXT;
