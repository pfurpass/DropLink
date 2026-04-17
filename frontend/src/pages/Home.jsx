import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { UploadCloud, File, X, Copy, Check, Link } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';

const Home = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Settings
  const [expiresInHours, setExpiresInHours] = useState('24');
  const [maxDownloads, setMaxDownloads] = useState('');
  const [password, setPassword] = useState('');

  const onDrop = useCallback(acceptedFiles => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('expiresInHours', expiresInHours);
    if (maxDownloads) formData.append('maxDownloads', maxDownloads);
    if (password) formData.append('password', password);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });
      
      setResult(res.data.linkId);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${import.meta.env.VITE_APP_URL}/d/${result}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (result) {
    const link = `${import.meta.env.VITE_APP_URL}/d/${result}`;
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div className="header" style={{ marginBottom: '1.5rem' }}>
          <h1>Upload Complete!</h1>
          <p>Your files are securely stored and ready to share.</p>
        </div>

        <div className="result-box">
          <p style={{ fontWeight: 500, color: 'var(--success)' }}>Here is your download link:</p>
          <div className="link-input-group">
            <input type="text" className="link-input" readOnly value={link} />
            <button className="btn" style={{ marginTop: 0, width: 'auto' }} onClick={copyToClipboard}>
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div className="qr-container">
            <QRCodeSVG value={link} size={150} />
          </div>
        </div>

        <button className="btn btn-outline" style={{ marginTop: '2rem' }} onClick={() => {
          setResult(null);
          setFiles([]);
          setProgress(0);
        }}>
          Upload More Files
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card">
      <div className="header">
        <h1>DropLink</h1>
        <p>Simple, secure, and fast file sharing.</p>
      </div>

      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        <UploadCloud className="dropzone-icon" />
        <p className="dropzone-text">Drag & drop your files here</p>
        <p className="dropzone-subtext">or click to browse files</p>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((f, i) => (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} key={i} className="file-item">
              <div className="file-info">
                <File className="file-icon" />
                <div className="file-details">
                  <span className="file-name">{f.name}</span>
                  <span className="file-size">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
              <button className="remove-btn" onClick={() => removeFile(i)} disabled={uploading}>
                <X size={20} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="grid-settings" style={{ marginTop: '2rem' }}>
          <div className="form-group" style={{ marginTop: 0 }}>
            <label className="form-label">Expires in</label>
            <select className="form-control" value={expiresInHours} onChange={e => setExpiresInHours(e.target.value)} disabled={uploading}>
              <option value="1">1 Hour</option>
              <option value="24">1 Day</option>
              <option value="168">7 Days</option>
              <option value="720">30 Days</option>
            </select>
          </div>
          <div className="form-group" style={{ marginTop: 0 }}>
            <label className="form-label">Max Downloads (Optional)</label>
            <input type="number" className="form-control" placeholder="Unlimited" value={maxDownloads} onChange={e => setMaxDownloads(e.target.value)} disabled={uploading} min="1" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: 0 }}>
            <label className="form-label">Password Protect (Optional)</label>
            <input type="password" className="form-control" placeholder="Enter a secret password" value={password} onChange={e => setPassword(e.target.value)} disabled={uploading} />
          </div>
        </div>
      )}

      {uploading && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="progress-text">{progress}% Uploaded</div>
        </div>
      )}

      <button className="btn" onClick={handleUpload} disabled={files.length === 0 || uploading}>
        {uploading ? 'Uploading...' : 'Generate Link'}
      </button>
    </motion.div>
  );
};

export default Home;
