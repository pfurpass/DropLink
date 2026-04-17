# DropLink

**DropLink** is a modern, lightweight file sharing service (similar to WeTransfer or file.io). It lets users upload files and share them as a short link or QR code — no account required.

---

## Features

- **Glassmorphism UI:** Clean, modern design with smooth animations via Framer Motion.
- **Drag & Drop:** Intuitive file upload for single or multiple files.
- **Auto ZIP:** Multiple files are bundled into a single ZIP archive on the fly.
- **Expiry:** Configurable link lifetime from 1 hour up to 30 days.
- **Download limits:** Automatically invalidate links after a set number of downloads.
- **Password protection:** Optional password secured with `scrypt` hashing (salt + timing-safe comparison).
- **File size limit:** Uploads capped at 100 MB per file server-side (configurable).
- **Auto cleanup:** Background job removes expired files and database entries on startup and every hour.
- **QR code:** A scannable QR code is generated automatically after each upload.

---

## Tech Stack

**Frontend**
- React 19 + Vite
- React Dropzone
- Framer Motion
- Axios & React Router
- Lucide React & qrcode.react

**Backend**
- Node.js & Express 5
- SQLite (embedded, zero config)
- Multer (file uploads with size limits)
- Archiver (on-the-fly ZIP generation)

---

## Getting Started

Requires **Node.js** installed on your system.

### 1. Start the backend

```bash
cd backend
npm install
npm start
```

The backend runs on **port 3001**. The SQLite database and `uploads/` folder are created automatically on first start.

Optional environment variables (`backend/.env`):

```env
PORT=3001
MAX_FILE_SIZE_MB=100
```

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Environment variables (`frontend/.env`, already included):

```env
VITE_API_URL=http://localhost:3001
VITE_APP_URL=http://localhost:5173
```

Then open your browser at **http://localhost:5173**

---

## Project Structure

```
sharing/
├── backend/
│   ├── database.js     # SQLite schema & setup
│   ├── server.js       # Express routes, upload/download, cleanup job
│   ├── uploads/        # (auto-created) uploaded files
│   └── package.json
└── frontend/
    ├── .env                   # API and app URL config
    ├── src/
    │   ├── App.jsx            # React Router setup
    │   ├── index.css          # Global styles (Glassmorphism)
    │   └── pages/
    │       ├── Home.jsx       # Upload page
    │       └── Download.jsx   # Download page & password prompt
    └── package.json
```

---
