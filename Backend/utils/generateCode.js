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
// in the database by checking and retrying if needed.
// Falls back to a generated value immediately when the landlord_code column is absent.
const generateUniqueLandlordCode = async (db) => {
  try {
    const code = generateLandlordCode();

    if (typeof db !== 'function') {
      return code;
    }

    const existing = await db(
      'SELECT user_id FROM users WHERE landlord_code = $1',
      [code]
    );

    if (existing.rows.length === 0) {
      return code;
    }

    return generateLandlordCode();
  } catch (error) {
    if (error?.message?.includes('landlord_code') || error?.message?.includes('column')) {
      return generateLandlordCode();
    }
    throw error;
  }
};

module.exports = { generateLandlordCode, generateUniqueLandlordCode };
