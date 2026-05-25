const jwt = require('jsonwebtoken');

// A secure fallback key for local dev if process.env.JWT_SECRET is missing.
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_cyber_security_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Token is sent as 'Bearer <token>'
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token is required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token.' });
    }
    // Attach decoded user info (id, email, username) to request
    req.user = decodedUser;
    next();
  });
}

module.exports = {
  authenticateToken,
  JWT_SECRET
};
