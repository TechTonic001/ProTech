const http = require('http');

function post(path, body, cookies) {
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

(async () => {
  try {
    // First login to obtain the refresh cookie set by server
    const login = await post('/api/auth/login', { identifier: 'smokelandlord', password: 'Password123!', expectedRole: 'landlord' });
    console.log('LOGIN', login.status);
    const setCookie = login.headers['set-cookie'];
    console.log('SET_COOKIE', setCookie);

    // Now call refresh with cookie
    const refresh = await post('/api/auth/refresh', {}, setCookie);
    console.log('REFRESH', refresh.status, refresh.body);
  } catch (err) {
    console.error('ERR', err);
  }
})();
