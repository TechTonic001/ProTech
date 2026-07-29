/**
 * Wraps an async controller function so any thrown error
 * is automatically passed to the Express error handler
 * middleware, eliminating the need for try/catch in every
 * controller function.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { asyncHandler };
