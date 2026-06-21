import pg from 'pg';
import Database from 'better-sqlite3';
import fs from 'fs/promises';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;
const DB_PATH = process.env.DB_PATH || './data/ai-builder.db';

let pool = null;     // PostgreSQL pool
let db = null;       // SQLite instance
let isPostgres = false;

export async function initializeDatabase() {
  if (DATABASE_URL && (DATABASE_URL.startsWith('postgresql://') || DATABASE_URL.startsWith('postgres://'))) {
    return initPostgres();
  }
  return initSqlite();
}

async function initPostgres() {
  isPostgres = true;
  const ssl = process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false;
  pool = new pg.Pool({ connectionString: DATABASE_URL, ssl });

  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }

  await createTablesPostgres();
  console.log('Database initialized (PostgreSQL)');
  return pool;
}

function initSqlite() {
  const dataDir = path.dirname(DB_PATH);
  fs.mkdir(dataDir, { recursive: true }).catch(() => {});

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTablesSqlite();
  console.log('Database initialized (SQLite) at:', DB_PATH);
  return db;
}

function query(sqlStr, params = []) {
  if (isPostgres) {
    if (!pool) throw new Error('Database not initialized');
    return pool.query(sqlStr, params);
  }
  if (!db) throw new Error('Database not initialized');
  // SQLite synchronous wrapper
  const stmt = db.prepare(sqlStr);
  if (sqlStr.trim().toUpperCase().startsWith('SELECT') || sqlStr.trim().toUpperCase().startsWith('WITH') || sqlStr.includes('RETURNING')) {
    const rows = stmt.all(...params);
    return { rows, rowCount: rows.length };
  }
  const result = stmt.run(...params);
  return { rowCount: result.changes, rows: [] };
}

async function queryOne(sqlStr, params = []) {
  const r = await query(sqlStr, params);
  return r.rows[0] || null;
}

async function queryAll(sqlStr, params = []) {
  const r = await query(sqlStr, params);
  return r.rows;
}

async function execute(sqlStr, params = []) {
  return query(sqlStr, params);
}

async function createTablesPostgres() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      name TEXT, avatar_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT,
      framework TEXT DEFAULT 'vite-react', path TEXT NOT NULL, status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS builds (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, status TEXT DEFAULT 'pending',
      output_path TEXT, error TEXT, started_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, status TEXT DEFAULT 'pending',
      url TEXT, error TEXT, config TEXT, started_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS deployment_logs (
      id SERIAL PRIMARY KEY, deployment_id TEXT NOT NULL, level TEXT DEFAULT 'info',
      message TEXT NOT NULL, metadata TEXT, created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS ai_chats (
      id TEXT PRIMARY KEY, project_id TEXT, user_id TEXT NOT NULL, messages TEXT NOT NULL,
      model TEXT DEFAULT 'ollama-default', created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS project_collaborators (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id TEXT NOT NULL,
      role TEXT DEFAULT 'viewer', created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(project_id, user_id)
    )`
  ];
  for (const sql of tables) {
    await execute(sql);
  }
  await execute(`
    CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_builds_project ON builds(project_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_project ON deployments(project_id);
    CREATE INDEX IF NOT EXISTS idx_ai_chats_project ON ai_chats(project_id);
    CREATE INDEX IF NOT EXISTS idx_collaborators_project ON project_collaborators(project_id);
  `);
}

function createTablesSqlite() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      name TEXT, avatar_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT,
      framework TEXT DEFAULT 'vite-react', path TEXT NOT NULL, status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS builds (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, status TEXT DEFAULT 'pending',
      output_path TEXT, error TEXT, started_at DATETIME DEFAULT CURRENT_TIMESTAMP, completed_at DATETIME,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, status TEXT DEFAULT 'pending',
      url TEXT, error TEXT, config TEXT, started_at DATETIME DEFAULT CURRENT_TIMESTAMP, completed_at DATETIME,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS deployment_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, deployment_id TEXT NOT NULL, level TEXT DEFAULT 'info',
      message TEXT NOT NULL, metadata TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS ai_chats (
      id TEXT PRIMARY KEY, project_id TEXT, user_id TEXT NOT NULL, messages TEXT NOT NULL,
      model TEXT DEFAULT 'ollama-default', created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS project_collaborators (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id TEXT NOT NULL,
      role TEXT DEFAULT 'viewer', created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(project_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_builds_project ON builds(project_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_project ON deployments(project_id);
    CREATE INDEX IF NOT EXISTS idx_ai_chats_project ON ai_chats(project_id);
    CREATE INDEX IF NOT EXISTS idx_collaborators_project ON project_collaborators(project_id);
  `);
}

function adaptSql(sqlStr) {
  if (!isPostgres) {
    return sqlStr.replace(/\$\d+/g, () => '?');
  }
  return sqlStr;
}

export function getPool() {
  return pool;
}

export const userOps = {
  create: (id, email, passwordHash, name) =>
    execute(adaptSql('INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)'), [id, email, passwordHash, name]),
  findByEmail: (email) => queryOne(adaptSql('SELECT * FROM users WHERE email = $1'), [email]),
  findById: (id) => queryOne(adaptSql('SELECT * FROM users WHERE id = $1'), [id]),
  update: (id, updates) => {
    const keys = Object.keys(updates);
    const fields = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(updates), id];
    const dateExpr = isPostgres ? 'NOW()' : "datetime('now')";
    return execute(adaptSql(`UPDATE users SET ${fields}, updated_at = ${dateExpr} WHERE id = $${keys.length + 1}`), values);
  }
};

export const projectOps = {
  create: (project) =>
    execute(adaptSql('INSERT INTO projects (id, user_id, name, description, framework, path) VALUES ($1, $2, $3, $4, $5, $6)'),
      [project.id, project.userId, project.name, project.description, project.framework, project.path]),
  get: (id) => queryOne(adaptSql('SELECT * FROM projects WHERE id = $1'), [id]),
  getByUser: (userId) => queryAll(adaptSql('SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC'), [userId]),
  update: (id, updates) => {
    const keys = Object.keys(updates);
    const fields = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(updates), id];
    const dateExpr = isPostgres ? 'NOW()' : "datetime('now')";
    return execute(adaptSql(`UPDATE projects SET ${fields}, updated_at = ${dateExpr} WHERE id = $${keys.length + 1}`), values);
  },
  delete: (id) => execute(adaptSql('DELETE FROM projects WHERE id = $1'), [id]),
  addCollaborator: (projectId, userId, role = 'editor') => {
    if (isPostgres) {
      return execute(
        adaptSql(`INSERT INTO project_collaborators (id, project_id, user_id, role) VALUES ($1, $2, $3, $4)
         ON CONFLICT (project_id, user_id) DO UPDATE SET role = $4`),
        [crypto.randomUUID(), projectId, userId, role]
      );
    }
    return execute(
      adaptSql('INSERT OR REPLACE INTO project_collaborators (id, project_id, user_id, role) VALUES ($1, $2, $3, $4)'),
      [crypto.randomUUID(), projectId, userId, role]
    );
  },
  getCollaborators: (projectId) =>
    queryAll(adaptSql(`SELECT pc.*, u.email, u.name, u.avatar_url
      FROM project_collaborators pc JOIN users u ON pc.user_id = u.id WHERE pc.project_id = $1`), [projectId]),
  removeCollaborator: (projectId, userId) =>
    execute(adaptSql('DELETE FROM project_collaborators WHERE project_id = $1 AND user_id = $2'), [projectId, userId])
};

export const buildOps = {
  create: (build) =>
    execute(adaptSql('INSERT INTO builds (id, project_id, status) VALUES ($1, $2, $3)'), [build.id, build.projectId, build.status || 'building']),
  update: (id, updates) => {
    const keys = Object.keys(updates);
    const fields = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(updates), id];
    return execute(adaptSql(`UPDATE builds SET ${fields} WHERE id = $${keys.length + 1}`), values);
  },
  getByProject: (projectId) => queryAll(adaptSql('SELECT * FROM builds WHERE project_id = $1 ORDER BY started_at DESC'), [projectId]),
  getLatest: (projectId) => queryOne(adaptSql('SELECT * FROM builds WHERE project_id = $1 ORDER BY started_at DESC LIMIT 1'), [projectId])
};

export const deployOps = {
  create: (deployment) =>
    execute(adaptSql('INSERT INTO deployments (id, project_id, status, url, config) VALUES ($1, $2, $3, $4, $5)'),
      [deployment.id, deployment.projectId, deployment.status || 'deploying', deployment.url, JSON.stringify(deployment.config || {})]),
  update: (id, updates) => {
    const keys = Object.keys(updates);
    const fields = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(updates), id];
    return execute(adaptSql(`UPDATE deployments SET ${fields} WHERE id = $${keys.length + 1}`), values);
  },
  getByProject: (projectId) => queryAll(adaptSql('SELECT * FROM deployments WHERE project_id = $1 ORDER BY started_at DESC'), [projectId]),
  getActive: (projectId) =>
    queryOne(adaptSql('SELECT * FROM deployments WHERE project_id = $1 AND status = $2 ORDER BY started_at DESC LIMIT 1'), [projectId, 'active']),
  addLog: (deploymentId, level, message, metadata) =>
    execute(adaptSql('INSERT INTO deployment_logs (deployment_id, level, message, metadata) VALUES ($1, $2, $3, $4)'),
      [deploymentId, level, message, JSON.stringify(metadata || {})]),
  getLogs: (deploymentId, limit = 100) =>
    queryAll(adaptSql('SELECT * FROM deployment_logs WHERE deployment_id = $1 ORDER BY created_at DESC LIMIT $2'), [deploymentId, limit])
};

export const chatOps = {
  save: (chat) =>
    execute(adaptSql('INSERT INTO ai_chats (id, project_id, user_id, messages, model) VALUES ($1, $2, $3, $4, $5)'),
      [chat.id, chat.projectId, chat.userId, JSON.stringify(chat.messages), chat.model || 'ollama-default']),
  getByProject: (projectId, limit = 50) =>
    queryAll(adaptSql('SELECT * FROM ai_chats WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2'), [projectId, limit]),
  getByUser: (userId, limit = 50) =>
    queryAll(adaptSql('SELECT * FROM ai_chats WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2'), [userId, limit])
};

export default {
  initialize: initializeDatabase,
  getPool,
  userOps,
  projectOps,
  buildOps,
  deployOps,
  chatOps
};
