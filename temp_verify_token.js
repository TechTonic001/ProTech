    const fs = require('fs');
const jwt = require('./Backend/node_modules/jsonwebtoken');
const envText = fs.readFileSync('./Backend/.env', 'utf8');
let secret = '';
envText.split(/\r?\n/).forEach((line) => {
  const trimmed = line.trim();
  if (trimmed.startsWith('JWT_SECRET=')) {
    secret = trimmed.substring(trimmed.indexOf('=') + 1);
  }
});
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozLCJyb2xlIjoidGVuYW50IiwiaWF0IjoxNzg1MzEwOTU4LCJleHAiOjE3ODUzMTQ1NTh9.8KeFMcXYGYcGETvCyNI9qDBIERXk4CypLd-IOyea9fE';
console.log('JWT_SECRET=', secret.slice(0, 8) + '...');
try {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  console.log('verified:', decoded);
} catch (err) {
  console.error('verify failed:', err.message);
}
