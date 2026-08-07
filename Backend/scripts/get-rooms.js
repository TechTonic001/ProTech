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

function get(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 5001,
      path,
      method: 'GET',
      headers: {},
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;

    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve({ status: res.statusCode, body: b, headers: res.headers }));
    });
    req.on('error', (e) => reject(e));
    req.end();
  });
}

(async () => {
  try {
    const login = await post('/api/auth/login', { identifier: 'smokelandlord', password: 'Password123!', expectedRole: 'landlord' });
    const parsed = JSON.parse(login.body || '{}');
    const accessToken = parsed?.data?.accessToken || parsed?.accessToken;
    console.log('LOGIN STATUS', login.status);
    const rooms = await get('/api/rooms/all-with-leases', accessToken);
    console.log('ROOMS', rooms.status, rooms.body.slice(0, 1000));
  } catch (err) {
    console.error('ERR', err);
  }
})();
