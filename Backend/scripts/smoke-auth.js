const http = require('http');

function post(path, body) {
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

    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const reg = await post('/api/auth/register', {
      username: 'smokelandlord',
      full_name: 'Smoke Landlord',
      email: 'smoke.landlord@example.com',
      phone_number: '08011112222',
      password: 'Password123!',
      role: 'landlord',
    });
    console.log('REGISTER:', reg.status, reg.body);

    const login = await post('/api/auth/login', {
      identifier: 'smokelandlord',
      password: 'Password123!',
      expectedRole: 'landlord',
    });
    console.log('LOGIN:', login.status, login.body);

    const parsed = JSON.parse(login.body || '{}');
    const accessToken = parsed?.data?.accessToken || parsed?.accessToken;
    if (!accessToken) {
      console.error('No access token returned; aborting further smoke calls');
      return;
    }

    const options = {
      hostname: 'localhost',
      port: 5001,
      path: '/api/property',
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    };

    const propReq = http.request(options, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => console.log('PROPERTIES:', res.statusCode, b));
    });
    propReq.on('error', (e) => console.error('PROP REQ ERR', e));
    propReq.end();
  } catch (err) {
    console.error('SMOKE ERROR', err);
  }
})();
