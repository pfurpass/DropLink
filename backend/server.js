require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');
const archiver = require('archiver');
const db = require('./database');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '100');
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.ensureDirSync(UPLOAD_DIR);

// Promisified db helpers
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

const SHARE_ID_RE = /^[a-f0-9]{8}$/;

app.post('/api/upload', upload.array('files'), async (req, res) => {
  const { expiresInHours, maxDownloads, password } = req.body;
  const shareId = req.shareId;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const hours = Math.min(Math.max(parseInt(expiresInHours) || 24, 1), 720);
  const maxDls = maxDownloads ? Math.min(Math.max(parseInt(maxDownloads), 1), 1000) : null;
  const passwordHash = password ? hashPassword(password) : null;

  const originalNames = files.map(f => sanitizeFilename(f.originalname)).join('||');
  const size = files.reduce((acc, f) => acc + f.size, 0);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hours);

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

// Multer file-size error handler
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
    for (const row of rows) {
      await fs.remove(path.join(UPLOAD_DIR, row.id));
      await dbRun("DELETE FROM shares WHERE id = ?", [row.id]);
      console.log(`Deleted expired share ${row.id}`);
    }
  } catch (err) {
    console.error('Cleanup error:', err);
  }
};

runCleanup();
setInterval(runCleanup, 1000 * 60 * 60);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
