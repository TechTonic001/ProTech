// utils/generateCode.js
// Generates a unique, human-readable landlord code
// Format: PT-XXXXXX (6 random uppercase letters and numbers)
// Excludes confusing characters: 0, O, 1, I, L

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
// Excluded: 0, O, 1, I, L because they look alike

const generateLandlordCode = () => {
  let code = 'PT-';
  for (let i = 0; i < 6; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
};

// Generates a code and guarantees it does not already exist
// in the database by checking and retrying if needed
const generateUniqueLandlordCode = async (db) => {
  let code;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    code = generateLandlordCode();
    const existing = await db(
      'SELECT user_id FROM users WHERE landlord_code = $1',
      [code]
    );
    if (existing.rows.length === 0) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Could not generate unique landlord code after 10 attempts');
  }

  return code;
};

module.exports = { generateLandlordCode, generateUniqueLandlordCode };
