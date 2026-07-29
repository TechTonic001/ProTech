const fs = require('fs');
// load Backend/.env
let JWT_SECRET = process.env.JWT_SECRET;
try {
  const envText = fs.readFileSync('./Backend/.env', 'utf8');
  envText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.substring(0, idx);
    let val = trimmed.substring(idx + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    if (key === 'JWT_SECRET') JWT_SECRET = val;
  });
} catch (err) {}

if (!JWT_SECRET) {
  console.error('No JWT_SECRET found');
  process.exit(1);
}

const path = require('path');
const jwtPath = path.join(__dirname, '..', 'Backend', 'node_modules', 'jsonwebtoken');
const jwt = require(jwtPath);
const userId = process.argv[2] ? Number(process.argv[2]) : 3;
const role = process.argv[3] || 'tenant';
const token = jwt.sign({ user_id: userId, role }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
console.log(token);
