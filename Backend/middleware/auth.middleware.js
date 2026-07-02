// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Explicitly enforce HS256 — prevents alg:none and RS/ES algorithm-confusion attacks (V4)
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    req.user = decoded;
    next();
  } catch (error) {
    // Do not leak the specific JWT error message to the client
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = {
  verifyToken,
};
