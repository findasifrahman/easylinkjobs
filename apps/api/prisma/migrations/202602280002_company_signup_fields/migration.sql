ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "contact_name" TEXT,
  ADD COLUMN IF NOT EXISTS "contact_designation" TEXT,
  ADD COLUMN IF NOT EXISTS "contact_email" TEXT,
  ADD COLUMN IF NOT EXISTS "contact_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "address_line_1" TEXT,
  ADD COLUMN IF NOT EXISTS "business_license_no" TEXT;
