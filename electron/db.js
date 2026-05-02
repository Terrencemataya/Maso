const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

let db = null
let SQL = null
let dbPath = null

async function initDatabase(userDataPath) {
  const initSqlJs = require('sql.js')

  // sql.js needs to locate the WASM binary
  SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
  })

  fs.mkdirSync(userDataPath, { recursive: true })
  dbPath = path.join(userDataPath, 'maso.db')

  // Load existing DB from disk if it exists, otherwise create new
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`PRAGMA journal_mode=WAL;`)
  db.run(`PRAGMA foreign_keys=ON;`)

  db.run(`
    CREATE TABLE IF NOT EXISTS streams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      username TEXT DEFAULT '',
      password TEXT DEFAULT '',
      transport TEXT DEFAULT 'tcp',
      buffer_mode TEXT DEFAULT 'low_latency',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS recordings (
      id TEXT PRIMARY KEY,
      stream_id TEXT,
      filename TEXT,
      path TEXT,
      started_at TEXT,
      ended_at TEXT,
      size_bytes INTEGER DEFAULT 0,
      duration_secs REAL DEFAULT 0
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      stream_id TEXT,
      path TEXT,
      captured_at TEXT DEFAULT (datetime('now'))
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `)

  _persist()

  // Seed demo streams on first run
  const countRes = db.exec('SELECT COUNT(*) as c FROM streams')
  const count = countRes[0]?.values[0]?.[0] ?? 0
  if (count === 0) {
    dbRun(
      'INSERT INTO streams (id, name, url, transport, buffer_mode) VALUES (?, ?, ?, ?, ?)',
      [_uuid(), 'Demo — Big Buck Bunny', 'rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4', 'tcp', 'balanced']
    )
    dbRun(
      'INSERT INTO streams (id, name, url, transport, buffer_mode) VALUES (?, ?, ?, ?, ?)',
      [_uuid(), 'Sample IP Camera', 'rtsp://your-camera-ip:554/stream', 'tcp', 'low_latency']
    )
  }

  console.log('[DB] Initialized at', dbPath)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _uuid() {
  return crypto.randomUUID()
}

let _persistTimer = null
function _persist() {
  // Debounce disk writes — flush at most once per second
  clearTimeout(_persistTimer)
  _persistTimer = setTimeout(() => {
    if (!db || !dbPath) return
    const data = db.export()
    fs.writeFileSync(dbPath, Buffer.from(data))
  }, 500)
}

function dbGet(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  if (stmt.step()) {
    const row = stmt.getAsObject()
    stmt.free()
    return row
  }
  stmt.free()
  return null
}

function dbAll(sql, params = []) {
  const results = []
  const stmt = db.prepare(sql)
  stmt.bind(params)
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

function dbRun(sql, params = []) {
  db.run(sql, params)
  _persist()
}

module.exports = { initDatabase, dbGet, dbAll, dbRun }
