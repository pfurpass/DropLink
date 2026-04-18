import { useState, useEffect } from 'react';
import axios from 'axios';
import { Check, Send } from 'lucide-react';

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
    PORT: '3001', MAX_FILE_SIZE_MB: '100', APP_URL: '',
    AUTH_METHOD: 'local', DB_TYPE: 'sqlite',
    LDAP_URL: '', LDAP_BASE_DN: '', LDAP_BIND_DN: '', LDAP_BIND_PASS: '',
    SSO_CLIENT_ID: '', SSO_CLIENT_SECRET: '', SSO_CALLBACK_URL: '',
    MAIL_ENABLED: 'false', SMTP_HOST: '', SMTP_PORT: '587', SMTP_SECURE: 'false',
    SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: '',
  });
  const [status, setStatus] = useState('');
  const [testTo, setTestTo] = useState('');
  const [testStatus, setTestStatus] = useState('');

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
  const mailOn = String(config.MAIL_ENABLED).toLowerCase() === 'true';

  const sendTest = async () => {
    if (!testTo.trim()) return;
    setTestStatus('sending');
    try {
      await axios.post(`${API}/api/admin/mail-test`, { to: testTo.trim() });
      setTestStatus('sent');
    } catch (err) {
      setTestStatus(err.response?.data?.error || 'error');
    }
    setTimeout(() => setTestStatus(''), 4000);
  };

  return (
    <div>
      <Section title="Server">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ width: '110px' }}>{field('PORT', 'PORT', config, setConfig, readOnly, 'number')}</div>
          <div style={{ width: '180px' }}>{field('Max File Size (MB)', 'MAX_FILE_SIZE_MB', config, setConfig, readOnly, 'number')}</div>
          <div style={{ flex: 1, minWidth: '220px' }}>{field('Public App URL (for email links)', 'APP_URL', config, setConfig, readOnly, 'text', 'http://localhost:5173')}</div>
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

      <Section title="Email (SMTP)">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: mailOn ? '1rem' : 0, cursor: readOnly ? 'default' : 'pointer' }}>
          <input
            type="checkbox"
            checked={mailOn}
            disabled={readOnly}
            onChange={e => setConfig(c => ({ ...c, MAIL_ENABLED: e.target.checked ? 'true' : 'false' }))}
          />
          <span style={{ fontSize: '0.9rem' }}>Enable sending download links by email</span>
        </label>

        {mailOn && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
              {field('SMTP Host', 'SMTP_HOST', config, setConfig, readOnly, 'text', 'smtp.example.com')}
              {field('SMTP Port', 'SMTP_PORT', config, setConfig, readOnly, 'number', '587')}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>SMTP Secure (TLS)</label>
                <select
                  className="form-control"
                  value={String(config.SMTP_SECURE).toLowerCase() === 'true' ? 'true' : 'false'}
                  disabled={readOnly}
                  onChange={e => setConfig(c => ({ ...c, SMTP_SECURE: e.target.value }))}
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', opacity: readOnly ? 0.6 : 1 }}
                >
                  <option value="false">false (STARTTLS / port 587)</option>
                  <option value="true">true (implicit TLS / port 465)</option>
                </select>
              </div>
              {field('SMTP Username', 'SMTP_USER', config, setConfig, readOnly)}
              {field('SMTP Password', 'SMTP_PASS', config, setConfig, readOnly, 'password')}
              {field('From Address', 'SMTP_FROM', config, setConfig, readOnly, 'text', 'noreply@example.com')}
            </div>

            {canEdit && (
              <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: 'rgba(15,23,42,0.4)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Send a test email using the currently saved settings (requires backend restart after you save).
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="your@email.com"
                    value={testTo}
                    onChange={e => setTestTo(e.target.value)}
                    style={{ flex: 1, minWidth: '180px', padding: '0.45rem 0.75rem', fontSize: '0.9rem' }}
                  />
                  <button
                    onClick={sendTest}
                    disabled={!testTo.trim() || testStatus === 'sending'}
                    style={{
                      borderRadius: '8px', padding: '0.5rem 0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                      background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--accent)', fontSize: '0.85rem',
                      opacity: (!testTo.trim() || testStatus === 'sending') ? 0.45 : 1,
                    }}
                  >
                    <Send size={13} />
                    {testStatus === 'sending' ? 'Sending...' : testStatus === 'sent' ? 'Sent!' : 'Send Test'}
                  </button>
                </div>
                {testStatus && testStatus !== 'sending' && testStatus !== 'sent' && (
                  <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '0.5rem' }}>{testStatus}</p>
                )}
              </div>
            )}
          </>
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
