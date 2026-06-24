ALTER TABLE users
ADD COLUMN IF NOT EXISTS landlord_code VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS users_landlord_code_unique
ON users (landlord_code)
WHERE landlord_code IS NOT NULL;

UPDATE users
SET landlord_code = CONCAT('PT-', LPAD(CAST(user_id AS TEXT), 6, '0'))
WHERE role = 'landlord' AND (landlord_code IS NULL OR landlord_code = '');
