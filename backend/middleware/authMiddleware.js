const jwt = require('jsonwebtoken');

// ---------------------------------------------------------
// THE MAIN SECURITY CHECKPOINT
// ---------------------------------------------------------
exports.protectRoute = (req, res, next) => {
  let token;

  // 1. Extract the Token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2. Reject if missing
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No cryptographic token provided.' });
  }

  try {
    // 3. Cryptographically verify the signature and expiration
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback_development_secret_do_not_use_in_prod'
    );

    // 4. Attach the safe user identity to the request
    req.user = decoded;

    // 5. Allow passage
    next();
  } catch (error) {
    console.warn('Security Alert: Invalid or expired token detected.');
    return res.status(401).json({ error: 'Session expired or token invalid. Please log in again.' });
  }
};

// ---------------------------------------------------------
// CORPORATE PRIVILEGE ENFORCEMENT
// ---------------------------------------------------------
exports.requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden. Elevated administrative privileges required.' });
  }
};