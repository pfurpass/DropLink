import { useState, useEffect } from 'react';
import axios from 'axios';
import { Check } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const DB_TYPES = [
  { value: 'sqlite',   label: 'SQLite',      note: '' },
  { value: 'postgres', label: 'PostgreSQL',  note: 'Requires additional server setup' },
  { value: 'mysql',    label: 'MySQL',       note: 'Requires additional server setup' },
];

const AUTH_METHODS = [
  { value: 'local', label: 'Local',      note: '' },
  { value: 'ldap',  label: 'LDAP',       note: 'Requires server-side LDAP configuration' },
  { value: 'sso',   label: 'SSO / OAuth', note: 'Requires server-side SSO configuration' },
];

const field = (label, key, config, setConfig, readOnly, type = 'text', placeholder = '') => (
  <div key={key}>
    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>{label}</label>
    <input
      type={type}
      className="form-control"
      placeholder={placeholder}
      value={config[key] || ''}
      onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
      disabled={readOnly}
      style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', opacity: readOnly ? 0.6 : 1 }}
    />
  </div>
);

const Section = ({ title, children }) => (
  <div style={{
    background: 'rgba(30,41,59,0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '1.25rem 1.5rem',
    marginBottom: '1rem',
  }}>
    <p style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem' }}>{title}</p>
    {children}
  </div>
);

const SettingsTab = ({ canEdit }) => {
  const readOnly = !canEdit;
  const [config, setConfig] = useState({
    PORT: '3001', MAX_FILE_SIZE_MB: '100',
    AUTH_METHOD: 'local', DB_TYPE: 'sqlite',
    LDAP_URL: '', LDAP_BASE_DN: '', LDAP_BIND_DN: '', LDAP_BIND_PASS: '',
    SSO_CLIENT_ID: '', SSO_CLIENT_SECRET: '', SSO_CALLBACK_URL: '',
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    axios.get(`${API}/api/admin/config`)
      .then(res => setConfig(c => ({ ...c, ...res.data })))
      .catch(() => {});
  }, []);

  const save = async () => {
    try {
      await axios.post(`${API}/api/admin/config`, config);
      setStatus('saved');
      setTimeout(() => setStatus(''), 3000);
    } catch {
      setStatus('error');
    }
  };

  const authMethod = config.AUTH_METHOD || 'local';
  const dbType = config.DB_TYPE || 'sqlite';

  return (
    <div>
      <Section title="Server">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ width: '110px' }}>{field('PORT', 'PORT', config, setConfig, readOnly, 'number')}</div>
          <div style={{ width: '180px' }}>{field('Max File Size (MB)', 'MAX_FILE_SIZE_MB', config, setConfig, readOnly, 'number')}</div>
        </div>
      </Section>

      <Section title="Database">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: dbType !== 'sqlite' ? '1rem' : 0 }}>
          {DB_TYPES.map(db => (
            <label key={db.value} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="db_type"
                value={db.value}
                checked={dbType === db.value}
                disabled={readOnly}
                onChange={() => setConfig(c => ({ ...c, DB_TYPE: db.value }))}
              />
              <span style={{ fontSize: '0.9rem' }}>{db.label}</span>
              {db.note && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>— {db.note}</span>}
            </label>
          ))}
        </div>
        {dbType === 'postgres' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', padding: '1rem', background: 'rgba(15,23,42,0.4)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            {field('Host', 'DB_HOST', config, setConfig, readOnly, 'text', 'localhost')}
            {field('Port', 'DB_PORT', config, setConfig, readOnly, 'number', '5432')}
            {field('Database', 'DB_NAME', config, setConfig, readOnly, 'text', 'droplink')}
            {field('User', 'DB_USER', config, setConfig, readOnly, 'text', 'postgres')}
            {field('Password', 'DB_PASS', config, setConfig, readOnly, 'password')}
          </div>
        )}
        {dbType === 'mysql' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', padding: '1rem', background: 'rgba(15,23,42,0.4)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            {field('Host', 'DB_HOST', config, setConfig, readOnly, 'text', 'localhost')}
            {field('Port', 'DB_PORT', config, setConfig, readOnly, 'number', '3306')}
            {field('Database', 'DB_NAME', config, setConfig, readOnly, 'text', 'droplink')}
            {field('User', 'DB_USER', config, setConfig, readOnly, 'text', 'root')}
            {field('Password', 'DB_PASS', config, setConfig, readOnly, 'password')}
          </div>
        )}
      </Section>

      <Section title="Authentication">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: authMethod !== 'local' ? '1rem' : 0 }}>
          {AUTH_METHODS.map(m => (
            <label key={m.value} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="auth_method"
                value={m.value}
                checked={authMethod === m.value}
                disabled={readOnly}
                onChange={() => setConfig(c => ({ ...c, AUTH_METHOD: m.value }))}
              />
              <span style={{ fontSize: '0.9rem' }}>{m.label}</span>
              {m.note && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>— {m.note}</span>}
            </label>
          ))}
        </div>
        {authMethod === 'ldap' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', padding: '1rem', background: 'rgba(15,23,42,0.4)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            {field('LDAP URL', 'LDAP_URL', config, setConfig, readOnly, 'text', 'ldap://your-server:389')}
            {field('Base DN', 'LDAP_BASE_DN', config, setConfig, readOnly, 'text', 'dc=example,dc=com')}
            {field('Bind DN', 'LDAP_BIND_DN', config, setConfig, readOnly, 'text', 'cn=admin,dc=example,dc=com')}
            {field('Bind Password', 'LDAP_BIND_PASS', config, setConfig, readOnly, 'password')}
          </div>
        )}
        {authMethod === 'sso' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', padding: '1rem', background: 'rgba(15,23,42,0.4)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            {field('Client ID', 'SSO_CLIENT_ID', config, setConfig, readOnly)}
            {field('Client Secret', 'SSO_CLIENT_SECRET', config, setConfig, readOnly, 'password')}
            {field('Callback URL', 'SSO_CALLBACK_URL', config, setConfig, readOnly, 'text', 'https://yourdomain.com/auth/callback')}
          </div>
        )}
      </Section>

      {canEdit && <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={save}
          style={{
            borderRadius: '8px', padding: '0.55rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 500,
          }}
        >
          <Check size={15} />
          {status === 'saved' ? 'Saved!' : status === 'error' ? 'Error saving' : 'Save Settings'}
        </button>
        {status === 'saved' && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Restart the backend for changes to take effect.</span>
        )}
      </div>}
    </div>
  );
};

export default SettingsTab;
