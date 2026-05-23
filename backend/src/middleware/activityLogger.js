const db = require('../database/db')

function logActivity(userId, userName, action, entityType, entityId, details) {
  try {
    db.prepare(
      'INSERT INTO activity_log (user_id, user_name, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId || null, userName || 'Admin', action, entityType || null, entityId ? String(entityId) : null, details || null)
  } catch (e) {
    console.error('Activity log error:', e.message)
  }
}

module.exports = { logActivity }
