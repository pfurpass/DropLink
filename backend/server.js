const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');
const archiver = require('archiver');
const db = require('./database');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '100');
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES = '8h';

app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.ensureDirSync(UPLOAD_DIR);

const dbGet = (query, params) => new Promise((resolve, reject) => {
  db.get(query, params, (err, row) => err ? reject(err) : resolve(row));
});
const dbRun = (query, params) => new Promise((resolve, reject) => {
  db.run(query, params, (err) => err ? reject(err) : resolve());
});
const dbAll = (query, params) => new Promise((resolve, reject) => {
  db.all(query, params, (err, rows) => err ? reject(err) : resolve(rows || []));
});

function sanitizeFilename(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._\-]/g, '_') || 'file';
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const shareId = req.shareId || uuidv4().replace(/-/g, '').substring(0, 8);
    req.shareId = shareId;
    const shareDir = path.join(UPLOAD_DIR, shareId);
    fs.ensureDirSync(shareDir);
    cb(null, shareDir);
  },
  filename: (_req, file, cb) => {
    cb(null, sanitizeFilename(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE } });

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const hashBuffer = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(hashBuffer, Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

const SHARE_ID_RE = /^[a-f0-9]{8}$/;

// ── Public routes ────────────────────────────────────────────────────────────

app.post('/api/upload', upload.array('files'), async (req, res) => {
  const { expiresInSeconds, maxDownloads, password } = req.body;
  const shareId = req.shareId;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const seconds = Math.min(Math.max(parseInt(expiresInSeconds) || 86400, 1), 2592000);
  const maxDls = maxDownloads ? Math.min(Math.max(parseInt(maxDownloads), 1), 1000) : null;
  const passwordHash = password ? hashPassword(password) : null;

  const originalNames = files.map(f => sanitizeFilename(f.originalname)).join('||');
  const size = files.reduce((acc, f) => acc + f.size, 0);
  const expiresAt = new Date(Date.now() + seconds * 1000);

  try {
    await dbRun(
      "INSERT INTO shares (id, fileName, originalNames, size, expiresAt, maxDownloads, passwordHash) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [shareId, files.length > 1 ? 'Archive.zip' : sanitizeFilename(files[0].originalname), originalNames, size, expiresAt.toISOString(), maxDls, passwordHash]
    );
    res.json({ linkId: shareId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/share/:id', async (req, res) => {
  const { id } = req.params;
  if (!SHARE_ID_RE.test(id)) return res.status(404).json({ error: 'Not found' });

  try {
    const row = await dbGet(
      "SELECT id, fileName, originalNames, size, expiresAt, maxDownloads, downloads, passwordHash FROM shares WHERE id = ?",
      [id]
    );
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (new Date(row.expiresAt) < new Date()) return res.status(410).json({ error: 'Link expired' });
    if (row.maxDownloads && row.downloads >= row.maxDownloads) return res.status(410).json({ error: 'Max downloads reached' });

    res.json({
      id: row.id,
      fileName: row.fileName,
      size: row.size,
      expiresAt: row.expiresAt,
      hasPassword: !!row.passwordHash,
      fileCount: row.originalNames.split('||').length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load share' });
  }
});

app.post('/api/download/:id', async (req, res) => {
  const { id } = req.params;
  if (!SHARE_ID_RE.test(id)) return res.status(404).json({ error: 'Not found' });

  const { password } = req.body;

  try {
    const row = await dbGet("SELECT * FROM shares WHERE id = ?", [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (new Date(row.expiresAt) < new Date()) return res.status(410).json({ error: 'Link expired' });
    if (row.maxDownloads && row.downloads >= row.maxDownloads) return res.status(410).json({ error: 'Max downloads reached' });

    if (row.passwordHash && !verifyPassword(password || '', row.passwordHash)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    await dbRun("UPDATE shares SET downloads = downloads + 1 WHERE id = ?", [id]);

    const shareDir = path.join(UPLOAD_DIR, id);
    const files = row.originalNames.split('||').map(sanitizeFilename);

    if (files.length === 1) {
      const filePath = path.join(shareDir, files[0]);
      if (!filePath.startsWith(shareDir + path.sep)) {
        return res.status(400).json({ error: 'Invalid file' });
      }
      res.download(filePath, files[0]);
    } else {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="DropLink-${id}.zip"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', err => { if (!res.headersSent) res.status(500).send({ error: err.message }); });
      archive.pipe(res);

      files.forEach(file => {
        const filePath = path.join(shareDir, file);
        if (filePath.startsWith(shareDir + path.sep)) {
          archive.file(filePath, { name: file });
        }
      });

      archive.finalize();
    }
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
  }
});

app.get('/api/expiry-options', async (_req, res) => {
  try {
    const rows = await dbAll("SELECT id, label, seconds FROM expiry_options ORDER BY seconds ASC", []);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load expiry options' });
  }
});

// ── Auth routes ──────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const user = await dbGet("SELECT * FROM users WHERE username = ?", [String(username).trim()]);
    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

// ── Admin routes (all protected) ─────────────────────────────────────────────

app.use('/api/admin', requireAuth);

app.get('/api/admin/expiry-options', async (_req, res) => {
  try {
    const rows = await dbAll("SELECT id, label, seconds FROM expiry_options ORDER BY seconds ASC", []);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load expiry options' });
  }
});

app.post('/api/admin/expiry-options', requireAdmin, async (req, res) => {
  const label = String(req.body.label || '').trim().slice(0, 40);
  const seconds = Math.min(Math.max(parseInt(req.body.seconds) || 0, 1), 2592000);
  if (!label) return res.status(400).json({ error: 'Label required' });
  try {
    const id = await new Promise((resolve, reject) => {
      db.run("INSERT INTO expiry_options (label, seconds) VALUES (?, ?)", [label, seconds],
        function(err) { err ? reject(err) : resolve(this.lastID); }
      );
    });
    res.json({ id, label, seconds });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add option' });
  }
});

app.delete('/api/admin/expiry-options/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    await dbRun("DELETE FROM expiry_options WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete option' });
  }
});

app.get('/api/admin/shares', async (_req, res) => {
  try {
    const rows = await dbAll(
      "SELECT id, fileName, originalNames, size, expiresAt, maxDownloads, downloads, passwordHash, createdAt FROM shares ORDER BY createdAt DESC",
      []
    );
    res.json(rows.map(row => ({
      id: row.id,
      fileName: row.fileName,
      fileCount: row.originalNames.split('||').length,
      size: row.size,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      maxDownloads: row.maxDownloads,
      downloads: row.downloads,
      hasPassword: !!row.passwordHash,
      expired: new Date(row.expiresAt) < new Date() || !!(row.maxDownloads && row.downloads >= row.maxDownloads),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load shares' });
  }
});

app.patch('/api/admin/shares/:id/expiry', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!SHARE_ID_RE.test(id)) return res.status(404).json({ error: 'Not found' });
  const date = new Date(req.body.expiresAt);
  if (!req.body.expiresAt || isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid date' });
  try {
    await dbRun("UPDATE shares SET expiresAt = ? WHERE id = ?", [date.toISOString(), id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update expiry' });
  }
});

app.delete('/api/admin/shares/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!SHARE_ID_RE.test(id)) return res.status(404).json({ error: 'Not found' });
  try {
    await fs.remove(path.join(UPLOAD_DIR, id));
    await dbRun("DELETE FROM shares WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.get('/api/admin/users', async (_req, res) => {
  try {
    const rows = await dbAll("SELECT id, username, role, createdAt FROM users ORDER BY createdAt ASC", []);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load users' });
  }
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  const username = String(req.body.username || '').trim().slice(0, 50);
  const password = String(req.body.password || '');
  const role = ['admin', 'viewer'].includes(req.body.role) ? req.body.role : 'admin';
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const id = await new Promise((resolve, reject) => {
      db.run("INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)",
        [username, hashPassword(password), role],
        function(err) { err ? reject(err) : resolve(this.lastID); }
      );
    });
    res.json({ id, username, role });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.patch('/api/admin/users/:id/password', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const password = String(req.body.password || '');
  if (!id || !password) return res.status(400).json({ error: 'Password required' });
  try {
    await dbRun("UPDATE users SET passwordHash = ? WHERE id = ?", [hashPassword(password), id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  try {
    const count = await dbGet("SELECT COUNT(*) as count FROM users", []);
    if (count.count <= 1) return res.status(400).json({ error: 'Cannot delete the last user' });
    await dbRun("DELETE FROM users WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

const ENV_PATH = path.join(__dirname, '.env');

function readEnvFile() {
  try { return dotenv.parse(fs.readFileSync(ENV_PATH, 'utf8')); } catch { return {}; }
}

const CONFIG_ALLOWED = [
  'PORT', 'MAX_FILE_SIZE_MB',
  'AUTH_METHOD', 'LDAP_URL', 'LDAP_BASE_DN', 'LDAP_BIND_DN', 'LDAP_BIND_PASS',
  'SSO_CLIENT_ID', 'SSO_CLIENT_SECRET', 'SSO_CALLBACK_URL',
  'DB_TYPE',
];

app.get('/api/admin/config', (_req, res) => {
  res.json(readEnvFile());
});

app.post('/api/admin/config', requireAdmin, (req, res) => {
  try {
    const existing = readEnvFile();
    CONFIG_ALLOWED.forEach(key => {
      if (req.body[key] !== undefined) {
        const val = String(req.body[key]).trim();
        if (['PORT', 'MAX_FILE_SIZE_MB'].includes(key)) {
          existing[key] = String(Math.max(1, parseInt(val) || 0));
        } else {
          existing[key] = val;
        }
      }
    });
    fs.writeFileSync(ENV_PATH, Object.entries(existing).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

app.use((err, _req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File too large. Maximum ${MAX_FILE_SIZE_MB}MB per file.` });
  }
  next(err);
});

const runCleanup = async () => {
  try {
    const rows = await dbAll(
      "SELECT id FROM shares WHERE expiresAt < ? OR (maxDownloads IS NOT NULL AND downloads >= maxDownloads)",
      [new Date().toISOString()]
    );
    await Promise.all(rows.map(async row => {
      await fs.remove(path.join(UPLOAD_DIR, row.id));
      await dbRun("DELETE FROM shares WHERE id = ?", [row.id]);
      console.log(`Deleted expired share ${row.id}`);
    }));
  } catch (err) {
    console.error('Cleanup error:', err);
  }
};

async function seedDefaultUser() {
  try {
    const row = await dbGet("SELECT COUNT(*) as count FROM users", []);
    if (row && row.count === 0) {
      const username = process.env.ADMIN_USER || 'admin';
      const password = process.env.ADMIN_PASS || 'admin';
      await dbRun("INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)",
        [username, hashPassword(password), 'admin']);
      console.log(`Default admin created — username: ${username}, password: ${password}`);
    }
  } catch (err) {
    console.error('Failed to seed default user:', err);
  }
}

runCleanup();
setInterval(runCleanup, 1000 * 60 * 60);

app.listen(PORT, async () => {
  console.log(`Backend running on port ${PORT}`);
  await seedDefaultUser();
});
