const mongoose = require('mongoose');

/**
 * Reject requests whose named path param is not a valid Mongo ObjectId,
 * so controllers never reach findById with a malformed id (which throws
 * a CastError and leaks driver internals).
 */
const validateObjectId = (paramName = 'id') => (req, res, next) => {
  const value = req.params[paramName];
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return res.status(400).json({ success: false, error: `Invalid ${paramName} format` });
  }
  return next();
};

module.exports = validateObjectId;
