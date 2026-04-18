import { useState, useEffect } from 'react';
import { formatSize } from '../../utils/format';
import axios from 'axios';
import { Trash2, Clock, ExternalLink, Lock, RefreshCw, Pencil, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL;

const btnBase = {
  borderRadius: '8px',
  padding: '0.45rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'opacity 0.2s',
};

function formatCountdown(expiresAt, now) {
  const diff = new Date(expiresAt) - now;
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function isExpired(share, now) {
  return new Date(share.expiresAt) < now || !!(share.maxDownloads && share.downloads >= share.maxDownloads);
}

const Countdown = ({ share, now }) => {
  const expired = isExpired(share, now);
  const cd = expired ? null : formatCountdown(share.expiresAt, now);
  const urgent = cd && !cd.includes('m') && !cd.includes('h') && !cd.includes('d');
  return (
    <span style={{ color: urgent ? 'var(--danger)' : 'inherit', fontVariantNumeric: 'tabular-nums' }}>
      {cd ? `⏱ ${cd}` : 'Expired'}
    </span>
  );
};

const SharesTab = ({ canEdit }) => {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  const [editingExpiry, setEditingExpiry] = useState(null);
  const [expiryOptions, setExpiryOptions] = useState([]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchShares = async () => {
    setLoading(true);
    setError('');
    try {
      const [sharesRes, optionsRes] = await Promise.all([
        axios.get(`${API}/api/admin/shares`),
        axios.get(`${API}/api/admin/expiry-options`),
      ]);
      setShares(sharesRes.data);
      setExpiryOptions(optionsRes.data);
    } catch {
      setError('Failed to load shares.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShares(); }, []);

  const handleExpire = async (id) => {
    const ts = new Date().toISOString();
    try {
      await axios.patch(`${API}/api/admin/shares/${id}/expiry`, { expiresAt: ts });
      setShares(prev => prev.map(s => s.id === id ? { ...s, expiresAt: ts } : s));
    } catch {
      setError('Failed to expire share.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this share permanently?')) return;
    try {
      await axios.delete(`${API}/api/admin/shares/${id}`);
      setShares(prev => prev.filter(s => s.id !== id));
    } catch {
      setError('Failed to delete share.');
    }
  };

  const handleExtend = async (share, addMs) => {
    const base = isExpired(share, now) ? Date.now() : Math.max(new Date(share.expiresAt).getTime(), Date.now());
    const newExpiry = new Date(base + addMs).toISOString();
    try {
      await axios.patch(`${API}/api/admin/shares/${share.id}/expiry`, { expiresAt: newExpiry });
      setShares(prev => prev.map(s => s.id === share.id ? { ...s, expiresAt: newExpiry } : s));
      setEditingExpiry(null);
    } catch {
      setError('Failed to update expiry.');
    }
  };

  const active = shares.filter(s => !isExpired(s, now)).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {active} active · {shares.length - active} expired
        </p>
        <button
          className="btn btn-outline"
          style={{ width: 'auto', marginTop: 0, padding: '0.5rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          onClick={fetchShares}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}
      {loading && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem 0' }}>Loading...</p>}
      {!loading && shares.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem 0' }}>No shares yet.</p>}

      <AnimatePresence>
        {shares.map(share => {
          const expired = isExpired(share, now);
          return (
            <motion.div
              key={share.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{
                background: 'rgba(30,41,59,0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '1rem 1.25rem',
                marginBottom: '0.65rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                    <a
                      href={`/d/${share.id}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      {share.fileName}
                      <ExternalLink size={12} color="var(--text-secondary)" />
                    </a>
                    {share.hasPassword && <Lock size={12} color="var(--text-secondary)" title="Password protected" />}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span>{share.fileCount} file{share.fileCount !== 1 ? 's' : ''}</span>
                    <span>{formatSize(share.size)}</span>
                    <span>{share.downloads}{share.maxDownloads ? `/${share.maxDownloads}` : ''} dl</span>
                    <Countdown share={share} now={now} />
                  </div>
                </div>

                <span style={{
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  background: expired ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                  color: expired ? 'var(--danger)' : 'var(--success)',
                  border: `1px solid ${expired ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
                  whiteSpace: 'nowrap',
                }}>
                  {expired ? 'Expired' : 'Active'}
                </span>

                {canEdit && <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    onClick={() => setEditingExpiry(editingExpiry === share.id ? null : share.id)}
                    style={{
                      ...btnBase,
                      padding: '0.4rem 0.7rem',
                      gap: '0.35rem',
                      fontSize: '0.78rem',
                      background: editingExpiry === share.id ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
                      border: `1px solid ${editingExpiry === share.id ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.2)'}`,
                      color: 'var(--accent)',
                    }}
                  >
                    {editingExpiry === share.id ? <X size={13} /> : <Pencil size={13} />}
                    {editingExpiry === share.id ? 'Cancel' : 'Extend'}
                  </button>
                  <button
                    onClick={() => handleExpire(share.id)}
                    disabled={expired}
                    style={{
                      ...btnBase,
                      padding: '0.4rem 0.7rem',
                      gap: '0.35rem',
                      fontSize: '0.78rem',
                      background: 'rgba(245,158,11,0.12)',
                      border: '1px solid rgba(245,158,11,0.25)',
                      color: '#f59e0b',
                      cursor: expired ? 'not-allowed' : 'pointer',
                      opacity: expired ? 0.35 : 1,
                    }}
                  >
                    <Clock size={13} /> Expire
                  </button>
                  <button
                    onClick={() => handleDelete(share.id)}
                    style={{
                      ...btnBase,
                      padding: '0.4rem 0.7rem',
                      gap: '0.35rem',
                      fontSize: '0.78rem',
                      background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: 'var(--danger)',
                    }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>}
              </div>

              <AnimatePresence>
                {canEdit && editingExpiry === share.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginRight: '0.25rem' }}>Adjust expiry:</span>
                      {expiryOptions.map(opt => {
                        const ms = opt.seconds * 1000;
                        return [
                          <button key={`-${opt.id}`} onClick={() => handleExtend(share, -ms)}
                            style={{ ...btnBase, padding: '0.3rem 0.7rem', fontSize: '0.8rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)' }}>
                            -{opt.label}
                          </button>,
                          <button key={`+${opt.id}`} onClick={() => handleExtend(share, ms)}
                            style={{ ...btnBase, padding: '0.3rem 0.7rem', fontSize: '0.8rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: 'var(--accent)' }}>
                            +{opt.label}
                          </button>,
                        ];
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default SharesTab;
