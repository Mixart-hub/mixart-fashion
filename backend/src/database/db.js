const { Database } = require('node-sqlite3-wasm')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env.node') })

const dbPath = path.resolve(__dirname, '../../', process.env.DB_PATH || 'mixart_node.db')
const _db = new Database(dbPath)

_db.exec('PRAGMA foreign_keys = ON')

// node-sqlite3-wasm only accepts array form for bind params.
// This wrapper normalises spread args (like better-sqlite3 does) so every
// route can call .run(a, b, c) or .run([a, b, c]) interchangeably.
const _norm = (args) =>
  args.length === 1 && Array.isArray(args[0]) ? args[0] : args

const _prepare = _db.prepare.bind(_db)
_db.prepare = (sql) => {
  const stmt = _prepare(sql)
  return {
    run:     (...args) => stmt.run(_norm(args)),
    get:     (...args) => stmt.get(_norm(args)) ?? undefined,
    all:     (...args) => stmt.all(_norm(args)),
    iterate: (...args) => stmt.iterate?.(_norm(args)),
  }
}

// Remove the lock directory on any exit so restarts don't fail with "database is locked"
const fs = require('fs')
const lockDir = dbPath + '.lock'
function _cleanup() {
  try { fs.rmdirSync(lockDir) } catch {}
}
process.on('exit', _cleanup)
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

module.exports = _db
