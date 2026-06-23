const http = require('http');
const https = require('https');

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const data = JSON.stringify(body);

    const options = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = lib.request(options, (res) => {
      let chunks = '';
      res.on('data', (d) => (chunks += d));
      res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const payload = {
      username: `testlandlord_node_${Date.now() % 100000}`,
      full_name: 'Node Test Landlord',
      email: `node_test_${Date.now() % 100000}@example.com`,
      phone_number: '+1234567899',
      password: 'Password123!',
      role: 'landlord',
      hostel_name: 'Node Hostel',
      hostel_address: 'Node Street 1'
    };

    console.log('Posting to local backend...');
    const local = await postJson('http://localhost:5001/api/auth/register', payload);
    console.log('Local response:', local.status, local.body);

    console.log('\nPosting to deployed backend...');
    const deployed = await postJson('https://protechbackend.vercel.app/api/auth/register', payload);
    console.log('Deployed response:', deployed.status, deployed.body);
  } catch (err) {
    console.error('Error during requests:', err.message);
  }
})();
