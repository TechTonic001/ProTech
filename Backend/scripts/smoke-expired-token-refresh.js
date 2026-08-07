const http = require('http');
const jwt = require('jsonwebtoken');

function post(path, body, cookies, token) {
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
    if (cookies) opts.headers.Cookie = cookies.join('; ');
    if (token) opts.headers.Authorization = `Bearer ${token}`;

    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: b }));
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
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: b }));
    });
    req.on('error', (e) => reject(e));
    req.end();
  });
}

(async () => {
  try {
    // Login landlord
    const login = await post('/api/auth/login', { identifier: 'smokelandlord', password: 'Password123!', expectedRole: 'landlord' });
    console.log('LOGIN', login.status);
    const setCookie = login.headers['set-cookie'];
    const body = JSON.parse(login.body || '{}');
    const validAccess = body?.data?.accessToken;
    if (!validAccess) return console.error('No access token from login');

    // Simulate an expired/invalid access token by using a malformed token.
    // The goal is to provoke a 401 from the protected endpoint, then
    // perform a refresh using the HttpOnly cookie and retry.
    const expiredToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid.signature';
    console.log('Using simulated expired token');

    // Call protected endpoint with expired token
    const protected1 = await get('/api/property', expiredToken);
    console.log('PROTECTED WITH EXPIRED TOKEN', protected1.status, protected1.body);

    // Call refresh using cookie
    const refresh = await post('/api/auth/refresh', {}, setCookie);
    console.log('REFRESH', refresh.status, refresh.body);
    const refreshBody = JSON.parse(refresh.body || '{}');
    const newAccess = refreshBody?.accessToken;
    if (!newAccess) return console.error('Refresh did not return new access token');

    // Retry protected endpoint with new token
    const protected2 = await get('/api/property', newAccess);
    console.log('PROTECTED WITH NEW TOKEN', protected2.status, protected2.body.slice(0,1000));

  } catch (err) {
    console.error('ERR', err);
  } finally {
    setTimeout(() => process.exit(0), 200);
  }
})();
