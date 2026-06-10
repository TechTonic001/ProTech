// middleware/rawBody.middleware.js

const rawBodyMiddleware = (req, res, buffer, encoding) => {
  if (buffer && buffer.length) {
    req.rawBody = buffer.toString(encoding || 'utf8');
  }
};

module.exports = {
  rawBodyMiddleware,
};
