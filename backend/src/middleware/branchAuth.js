const jwt = require('jsonwebtoken')

const BRANCH_ROLES = ['branch_manager', 'seller', 'operator']
const ALLOWED_ROLES = ['admin', 'super_admin', ...BRANCH_ROLES]

module.exports = (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Token kerak' })
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    if (!ALLOWED_ROLES.includes(payload.role)) {
      return res.status(403).json({ detail: 'Xodim huquqi kerak' })
    }
    req.user = payload
    req.branchId = BRANCH_ROLES.includes(payload.role) ? (payload.branch_id || null) : null
    next()
  } catch {
    res.status(401).json({ detail: 'Token yaroqsiz' })
  }
}
