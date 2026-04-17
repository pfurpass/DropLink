# 🚀 DropLink

**DropLink** ist ein moderner, simpel gehaltener File-Sharing-Dienst (ähnlich wie WeTransfer, SwissTransfer oder file.io). Er ermöglicht es Nutzern, Dateien sicher, schnell und ohne Account-Zwang hochzuladen und als kompakten Link oder QR-Code zu teilen.

---

## 🌟 Features

- **Premium Design:** Lebendiges, modernes Glassmorphism-UI mit sanften Farbverläufen und Micro-Animations.
- **Drag & Drop:** Intuitiver Datei-Upload für einzelne oder mehrere Dateien.
- **Automatisches Zippen:** Mehrere Dateien werden auf dem Server nahtlos zu einer einzigen ZIP-Datei zusammengefasst und beim Download so ausgeliefert.
- **Ablaufdatum:** Einstellbare Gültigkeit der Links (1 Stunde bis 30 Tage).
- **Download-Limits:** Links nach einer bestimmten Anzahl von Downloads automatisch invalidieren.
- **Passwortschutz:** Optionaler Schutz der Dateien mit AES-SHA256 gehärtetem Passwort-Hash.
- **Intelligentes Cleanup:** Ein integrierter Cron-Job bereinigt vollautomatisch abgelaufene Dateien und Metadaten vom Datenträger und aus der Datenbank (sogar sofort nach einem Server-Restart).
- **QR-Code Generator:** Erstellt beim Upload automatisch einen scanbaren QR-Code für schnelles Teilen auf mobile Geräte.

---

## 🛠 Tech Stack

**Frontend**
- React 18 + Vite
- React Dropzone (für Drag & Drop)
- Framer Motion (für flüssige Animationen)
- Axios & React Router
- Lucide React (Icons) & qrcode.react

**Backend**
- Node.js & Express.js
- SQLite (Eingebettete Datenbank für extrem einfaches Setup)
- Multer (für Resumable / Chunked Upload Handling)
- Archiver (für On-the-Fly ZIP Generierung)
- fs-extra & node-cron Konzepte

---

## 🚀 Installation & Start

Um das Projekt lokal auszuführen, benötigst du **Node.js** auf deinem System. Das Projekt ist aufgeteilt in `frontend` und `backend`.

### 1. Backend starten
Das Backend läuft standardmäßig auf **Port 3001** und speichert die Uploads im lokalen Ordner `backend/uploads`.

\`\`\`bash
cd backend
npm install
npm start
\`\`\`

*(Die SQLite-Datenbank `droplink.sqlite` und der Ordner `uploads` werden beim ersten Start automatisch erstellt.)*

### 2. Frontend starten
Das Frontend läuft über Vite standardmäßig auf **Port 5173**.

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

Öffne anschließend deinen Browser und besuche: **[http://localhost:5173](http://localhost:5173)**

---

## 📁 Projektstruktur

\`\`\`text
sharing/
├── backend/
│   ├── database.js     # SQLite Tabellen-Schema & Setup
│   ├── server.js       # Express Server, Upload/Download Routes & Cleanup-Job
│   ├── uploads/        # (wird automatisch erstellt) Hier landen die Dateien
│   └── package.json    # Backend Dependencies
└── frontend/
    ├── src/
    │   ├── App.jsx            # React Router Setup
    │   ├── index.css          # Premium Global Styles (Glassmorphism, Animations)
    │   └── pages/
    │       ├── Home.jsx       # Upload-Seite & Konfiguration
    │       └── Download.jsx   # Download-Screen & Passwort-Abfrage
    ├── package.json           # Frontend Dependencies
    └── vite.config.js         # Vite Konfiguration
\`\`\`

---
