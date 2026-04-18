import { useState, useCallback, useEffect } from 'react';
import { formatSize } from '../utils/format';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { UploadCloud, File, X, Copy, Check, Mail } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';

const API = import.meta.env.VITE_API_URL;

const Home = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const [expiryOptions, setExpiryOptions] = useState([]);
  const [expiresInSeconds, setExpiresInSeconds] = useState('');
  const [maxDownloads, setMaxDownloads] = useState('');
  const [password, setPassword] = useState('');

  const [mailAvailable, setMailAvailable] = useState(false);
  const [sendMail, setSendMail] = useState(false);
  const [mailTo, setMailTo] = useState('');
  const [mailFromName, setMailFromName] = useState('');
  const [mailMessage, setMailMessage] = useState('');
  const [mailNotice, setMailNotice] = useState('');

  useEffect(() => {
    axios.get(`${API}/api/expiry-options`)
      .then(res => {
        setExpiryOptions(res.data);
        if (res.data.length > 0) setExpiresInSeconds(String(res.data[0].seconds));
      })
      .catch(() => {
        const fallback = [{ id: 0, label: '1 Day', seconds: 86400 }];
        setExpiryOptions(fallback);
        setExpiresInSeconds('86400');
      });

    axios.get(`${API}/api/mail-status`)
      .then(res => setMailAvailable(!!res.data.enabled))
      .catch(() => {});
  }, []);

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
    formData.append('expiresInSeconds', expiresInSeconds);
    if (maxDownloads) formData.append('maxDownloads', maxDownloads);
    if (password) formData.append('password', password);
    if (mailAvailable && sendMail && mailTo.trim()) {
      formData.append('mailTo', mailTo.trim());
      if (mailFromName.trim()) formData.append('mailFromName', mailFromName.trim());
      if (mailMessage.trim()) formData.append('mailMessage', mailMessage.trim());
    }

    try {
      const res = await axios.post(`${API}/api/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });
      setResult(res.data.linkId);
      if (res.data.mailError) setMailNotice(res.data.mailError);
      else if (res.data.mailSent) setMailNotice(`Link sent to ${mailTo.trim()}`);
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

        {mailNotice && (
          <p style={{
            marginTop: '1rem', padding: '0.6rem 0.9rem', borderRadius: '8px',
            background: mailNotice.startsWith('Link sent') ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${mailNotice.startsWith('Link sent') ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
            color: mailNotice.startsWith('Link sent') ? 'var(--success)' : '#f59e0b',
            fontSize: '0.85rem', textAlign: 'center',
          }}>
            {mailNotice}
          </p>
        )}

        <button className="btn btn-outline" style={{ marginTop: '2rem' }} onClick={() => {
          setResult(null);
          setFiles([]);
          setProgress(0);
          setMailNotice('');
          setMailTo('');
          setMailFromName('');
          setMailMessage('');
          setSendMail(false);
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
                  <span className="file-size">{formatSize(f.size)}</span>
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
            <select className="form-control" value={expiresInSeconds} onChange={e => setExpiresInSeconds(e.target.value)} disabled={uploading}>
              {expiryOptions.map(opt => (
                <option key={opt.id} value={opt.seconds}>{opt.label}</option>
              ))}
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

          {mailAvailable && (
            <div style={{ gridColumn: '1 / -1', marginTop: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={sendMail} onChange={e => setSendMail(e.target.checked)} disabled={uploading} />
                <Mail size={15} /> Send download link by email
              </label>

              {sendMail && (
                <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.65rem' }}>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Recipient email"
                    value={mailTo}
                    onChange={e => setMailTo(e.target.value)}
                    disabled={uploading}
                    required
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Your name (optional)"
                    value={mailFromName}
                    onChange={e => setMailFromName(e.target.value)}
                    disabled={uploading}
                  />
                  <textarea
                    className="form-control"
                    placeholder="Message (optional)"
                    value={mailMessage}
                    onChange={e => setMailMessage(e.target.value)}
                    disabled={uploading}
                    rows={3}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                  {password && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                      The password will be included in the email in plain text.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
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
