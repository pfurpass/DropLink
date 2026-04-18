import { useState, useEffect } from 'react';
import { formatSize } from '../utils/format';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Download as DownloadIcon, File, Lock, AlertTriangle, ArrowLeft, Archive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

const Download = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/share/${id}`)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to load link info');
        setLoading(false);
      });
  }, [id]);

  const handleDownload = async () => {
    setDownloading(true);
    setError('');

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/download/${id}`, { password }, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = data.fileName;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setData(prev => ({...prev, downloads: prev.downloads ? prev.downloads + 1 : undefined}));
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Incorrect password');
      } else {
        setError('Download failed. Link may have expired.');
      }
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>Loading link information...</h2>
      </div>
    );
  }

  if (error && !data) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ textAlign: 'center' }}>
        <AlertTriangle size={64} color="var(--danger)" style={{ margin: '0 auto 1.5rem' }} />
        <h1 style={{ marginBottom: '1rem', color: 'var(--danger)' }}>Oops!</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{error}</p>
        <Link to="/" className="btn" style={{ width: 'auto' }}>
          <ArrowLeft size={20} /> Back to Home
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card">
      <div className="header" style={{ marginBottom: '2rem' }}>
        <h1>Ready to Download</h1>
        <p>Someone shared files with you via DropLink.</p>
      </div>

      <div className="result-box" style={{ marginTop: 0, marginBottom: '2rem', textAlign: 'left', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          {data.fileCount > 1 ? <Archive size={32} color="var(--accent)" /> : <File size={32} color="var(--accent)" />}
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>
              {data.fileName}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {data.fileCount} {data.fileCount === 1 ? 'file' : 'files'} • {formatSize(data.size)}
            </p>
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Expires {formatDistanceToNow(new Date(data.expiresAt), { addSuffix: true })}
        </p>
      </div>

      {data.hasPassword && (
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={16} /> Password Protected
          </label>
          <input 
            type="password" 
            className="form-control" 
            placeholder="Enter password to download" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
        </div>
      )}

      {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}

      <button 
        className="btn" 
        onClick={handleDownload} 
        disabled={downloading || (data.hasPassword && !password)}
      >
        <DownloadIcon size={20} />
        {downloading ? 'Downloading...' : 'Download Files'}
      </button>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Create your own DropLink
        </Link>
      </div>
    </motion.div>
  );
};

export default Download;
