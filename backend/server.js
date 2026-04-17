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

app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.ensureDirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const shareId = req.shareId || uuidv4().replace(/-/g, '').substring(0, 8);
    req.shareId = shareId;
    const shareDir = path.join(UPLOAD_DIR, shareId);
    fs.ensureDirSync(shareDir);
    cb(null, shareDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

function hashPassword(password) {
  if (!password) return null;
  return crypto.createHash('sha256').update(password).digest('hex');
}

app.post('/api/upload', upload.array('files'), (req, res) => {
  const { expiresInHours, maxDownloads, password } = req.body;
  const shareId = req.shareId;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const originalNames = files.map(f => f.originalname).join('||');
  const size = files.reduce((acc, f) => acc + f.size, 0);
  
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + parseInt(expiresInHours || 24));

  const passwordHash = hashPassword(password);
  const maxDls = maxDownloads ? parseInt(maxDownloads) : null;

  db.run(
    "INSERT INTO shares (id, fileName, originalNames, size, expiresAt, maxDownloads, passwordHash) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [shareId, files.length > 1 ? 'Archive.zip' : files[0].originalname, originalNames, size, expiresAt.toISOString(), maxDls, passwordHash],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ linkId: shareId });
    }
  );
});

app.get('/api/share/:id', (req, res) => {
  const { id } = req.params;
  db.get("SELECT id, fileName, originalNames, size, expiresAt, maxDownloads, downloads, passwordHash FROM shares WHERE id = ?", [id], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    if (new Date(row.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Link expired' });
    }

    if (row.maxDownloads && row.downloads >= row.maxDownloads) {
      return res.status(410).json({ error: 'Max downloads reached' });
    }

    res.json({
      id: row.id,
      fileName: row.fileName,
      size: row.size,
      expiresAt: row.expiresAt,
      hasPassword: !!row.passwordHash,
      fileCount: row.originalNames.split('||').length
    });
  });
});

app.post('/api/download/:id', (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  db.get("SELECT * FROM shares WHERE id = ?", [id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Not found' });
    
    if (new Date(row.expiresAt) < new Date()) return res.status(410).json({ error: 'Link expired' });
    if (row.maxDownloads && row.downloads >= row.maxDownloads) return res.status(410).json({ error: 'Max downloads reached' });
    
    if (row.passwordHash) {
      if (hashPassword(password) !== row.passwordHash) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    db.run("UPDATE shares SET downloads = downloads + 1 WHERE id = ?", [id]);

    const shareDir = path.join(UPLOAD_DIR, id);
    const files = row.originalNames.split('||');

    if (files.length === 1) {
      const filePath = path.join(shareDir, files[0]);
      res.download(filePath, files[0]);
    } else {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="DropLink-${id}.zip"`);
      
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', err => res.status(500).send({error: err.message}));
      archive.pipe(res);
      
      files.forEach(file => {
        archive.file(path.join(shareDir, file), { name: file });
      });
      
      archive.finalize();
    }
  });
});

const runCleanup = () => {
  console.log('Running cleanup task...');
  db.all("SELECT id FROM shares WHERE expiresAt < ? OR (maxDownloads IS NOT NULL AND downloads >= maxDownloads)", [new Date().toISOString()], (err, rows) => {
    if (err || !rows) return;
    rows.forEach(row => {
      fs.remove(path.join(UPLOAD_DIR, row.id), () => {
        db.run("DELETE FROM shares WHERE id = ?", [row.id]);
        console.log(`Deleted expired share ${row.id}`);
      });
    });
  });
};

runCleanup(); // Direkt beim Start aufräumen
setInterval(runCleanup, 1000 * 60 * 60); // Dann wieder jede Stunde

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
