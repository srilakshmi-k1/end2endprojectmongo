const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'edusafeguard_jwt_secret_v2';

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided.' });

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ error: 'Admin access required.' });
  next();
}

function requireCounsellor(req, res, next) {
  if (req.user?.role !== 'counsellor')
    return res.status(403).json({ error: 'Counsellor access required.' });
  next();
}

// aliases so both names work
module.exports = { authenticate, requireAdmin, requireCounsellor, adminOnly: requireAdmin, counsellorOnly: requireCounsellor };
