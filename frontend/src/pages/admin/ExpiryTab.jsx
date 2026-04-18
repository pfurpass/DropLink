import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Plus } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const btnBase = {
  borderRadius: '8px',
  padding: '0.45rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'opacity 0.2s',
};

const UNITS = [
  { value: 'seconds', label: 'Seconds', toSeconds: v => v },
  { value: 'minutes', label: 'Minutes', toSeconds: v => v * 60 },
  { value: 'hours',   label: 'Hours',   toSeconds: v => v * 3600 },
  { value: 'days',    label: 'Days',    toSeconds: v => v * 86400 },
];

function autoLabel(value, unit) {
  const v = parseInt(value);
  if (!v || v < 1) return '';
  const s = v !== 1 ? 's' : '';
  const u = UNITS.find(u => u.value === unit) || UNITS[1];
  return `${v} ${u.label.replace(/s$/, '')}${s}`;
}

function formatDuration(s) {
  if (s < 60) return `${s}s`;
  if (s < 3600) { const m = s / 60; return Number.isInteger(m) ? `${m}m` : `${(s / 60).toFixed(1)}m`; }
  if (s < 86400) { const h = s / 3600; return Number.isInteger(h) ? `${h}h` : `${(s / 3600).toFixed(1)}h`; }
  const d = s / 86400; return Number.isInteger(d) ? `${d}d` : `${(s / 86400).toFixed(1)}d`;
}

const ExpiryTab = ({ canEdit }) => {
  const [expiryOptions, setExpiryOptions] = useState([]);
  const [newValue, setNewValue] = useState('');
  const [newUnit, setNewUnit] = useState('minutes');
  const [error, setError] = useState('');

  const fetchOptions = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/expiry-options`);
      setExpiryOptions(res.data);
    } catch {
      setError('Failed to load expiry presets.');
    }
  };

  useEffect(() => { fetchOptions(); }, []);

  const addOption = async () => {
    const v = parseInt(newValue);
    if (!v || v < 1) return;
    const unitDef = UNITS.find(u => u.value === newUnit) || UNITS[1];
    const seconds = unitDef.toSeconds(v);
    const label = autoLabel(v, newUnit);
    try {
      const res = await axios.post(`${API}/api/admin/expiry-options`, { label, seconds });
      setExpiryOptions(prev => [...prev, res.data].sort((a, b) => a.seconds - b.seconds));
      setNewValue('');
    } catch {
      setError('Failed to add expiry preset.');
    }
  };

  const deleteOption = async (id) => {
    try {
      await axios.delete(`${API}/api/admin/expiry-options/${id}`);
      setExpiryOptions(prev => prev.filter(o => o.id !== id));
    } catch {
      setError('Failed to delete expiry preset.');
    }
  };

  return (
    <div>
      {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}

      <div style={{
        background: 'rgba(30,41,59,0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        overflow: 'hidden',
      }}>
        {expiryOptions.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '1rem 1.25rem', fontSize: '0.9rem' }}>No presets yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0.65rem 1.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Label</th>
                <th style={{ textAlign: 'left', padding: '0.65rem 1.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Duration</th>
                <th style={{ padding: '0.65rem 1.25rem' }} />
              </tr>
            </thead>
            <tbody>
              {expiryOptions.map((opt, i) => (
                <tr key={opt.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                  <td style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}>{opt.label}</td>
                  <td style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{formatDuration(opt.seconds)}</td>
                  <td style={{ padding: '0.65rem 1.25rem', textAlign: 'right' }}>
                    {canEdit && (
                      <button
                        onClick={() => deleteOption(opt.id)}
                        style={{ ...btnBase, padding: '0.3rem 0.6rem', gap: '0.3rem', fontSize: '0.78rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)' }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {canEdit && <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="number"
            className="form-control"
            placeholder="e.g. 30"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            min="1"
            style={{ width: '100px', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
          />
          <select
            className="form-control"
            value={newUnit}
            onChange={e => setNewUnit(e.target.value)}
            style={{ width: '120px', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
          >
            {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
          {newValue && parseInt(newValue) > 0 && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>→ "{autoLabel(newValue, newUnit)}"</span>
          )}
          <button
            onClick={addOption}
            disabled={!newValue || parseInt(newValue) < 1}
            style={{ ...btnBase, padding: '0.45rem 0.9rem', gap: '0.35rem', fontSize: '0.85rem', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--accent)', opacity: (!newValue || parseInt(newValue) < 1) ? 0.45 : 1 }}
          >
            <Plus size={14} /> Add
          </button>
        </div>}
      </div>
    </div>
  );
};

export default ExpiryTab;
