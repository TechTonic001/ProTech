const http = require('http');

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost',
      port: 5001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;

    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve({ status: res.statusCode, body: b, headers: res.headers }));
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

(async () => {
  try {
    // Login existing landlord
    const login = await post('/api/auth/login', { identifier: 'smokelandlord', password: 'Password123!', expectedRole: 'landlord' });
    const parsed = JSON.parse(login.body || '{}');
    const accessToken = parsed?.data?.accessToken || parsed?.accessToken;
    console.log('LOGIN STATUS', login.status);
    if (!accessToken) return console.error('No access token');

    // Create property
    const createRes = await post('/api/property', {
      property_name: 'Smoke Test Hostel',
      address: '1 Test Street',
      city: 'Testville',
      total_rooms: 3,
      default_room_type: 'single',
      default_yearly_rent: 1200000
    }, accessToken);

    console.log('CREATE PROPERTY', createRes.status, createRes.body);
  } catch (err) {
    console.error('ERR', err);
  }
})();
