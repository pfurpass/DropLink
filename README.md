# DropLink

**DropLink** ist ein moderner, simpel gehaltener File-Sharing-Dienst (ähnlich wie WeTransfer, SwissTransfer oder file.io). Er ermöglicht es Nutzern, Dateien sicher, schnell und ohne Account-Zwang hochzuladen und als kompakten Link oder QR-Code zu teilen.

---

## Features

- **Premium Design:** Lebendiges, modernes Glassmorphism-UI mit sanften Farbverläufen und Micro-Animations.
- **Drag & Drop:** Intuitiver Datei-Upload für einzelne oder mehrere Dateien.
- **Automatisches Zippen:** Mehrere Dateien werden auf dem Server nahtlos zu einer einzigen ZIP-Datei zusammengefasst.
- **Ablaufdatum:** Einstellbare Gültigkeit der Links (1 Stunde bis 30 Tage).
- **Download-Limits:** Links nach einer bestimmten Anzahl von Downloads automatisch invalidieren.
- **Passwortschutz:** Optionaler Schutz mit `scrypt`-gehashetem Passwort (Salt + Timing-Safe-Vergleich).
- **Dateigrößen-Limit:** Uploads werden serverseitig auf max. 100 MB pro Datei begrenzt (konfigurierbar).
- **Intelligentes Cleanup:** Integrierter Cron-Job bereinigt abgelaufene Dateien und Datenbankeinträge vollautomatisch.
- **QR-Code Generator:** Erstellt beim Upload automatisch einen scanbaren QR-Code.

---

## Tech Stack

**Frontend**
- React 19 + Vite
- React Dropzone (Drag & Drop)
- Framer Motion (Animationen)
- Axios & React Router
- Lucide React (Icons) & qrcode.react

**Backend**
- Node.js & Express 5
- SQLite (eingebettete Datenbank, kein Setup nötig)
- Multer (Datei-Upload mit Größen-Limit)
- Archiver (On-the-Fly ZIP-Generierung)

---

## Installation & Start

Voraussetzung: **Node.js** auf dem System installiert.

### 1. Backend starten

```bash
cd backend
npm install
npm start
```

Das Backend läuft auf **Port 3001**. Die SQLite-Datenbank und der `uploads/`-Ordner werden beim ersten Start automatisch angelegt.

Optionale Umgebungsvariablen (`.env` im `backend/`-Ordner):

```env
PORT=3001
MAX_FILE_SIZE_MB=100
```

### 2. Frontend starten

```bash
cd frontend
npm install
npm run dev
```

Umgebungsvariablen (`.env` im `frontend/`-Ordner, bereits enthalten):

```env
VITE_API_URL=http://localhost:3001
VITE_APP_URL=http://localhost:5173
```

Anschließend Browser öffnen: **http://localhost:5173**

---

## Projektstruktur

```
sharing/
├── backend/
│   ├── database.js     # SQLite Schema & Setup
│   ├── server.js       # Express Routes, Upload/Download, Cleanup-Job
│   ├── uploads/        # (auto-erstellt) Hochgeladene Dateien
│   └── package.json
└── frontend/
    ├── .env                   # API- und App-URL Konfiguration
    ├── src/
    │   ├── App.jsx            # React Router Setup
    │   ├── index.css          # Globale Styles (Glassmorphism)
    │   └── pages/
    │       ├── Home.jsx       # Upload-Seite
    │       └── Download.jsx   # Download-Seite & Passwort-Abfrage
    └── package.json
```

---
