const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Token kerak' })
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    const ALLOWED = ['admin', 'operator', 'super_admin', 'branch_manager', 'seller']
    if (!ALLOWED.includes(payload.role)) {
      return res.status(403).json({ detail: 'Admin huquqi kerak' })
    }
    req.user = payload
    next()
  } catch {
    res.status(401).json({ detail: 'Token yaroqsiz' })
  }
}
