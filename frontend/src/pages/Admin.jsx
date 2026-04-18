import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { clearToken } from '../utils/auth';
import SharesTab from './admin/SharesTab';
import ExpiryTab from './admin/ExpiryTab';
import UsersTab from './admin/UsersTab';
import SettingsTab from './admin/SettingsTab';

const API = import.meta.env.VITE_API_URL;

const TABS = [
  { id: 'shares',   label: 'Shares' },
  { id: 'expiry',   label: 'Expiry Presets' },
  { id: 'users',    label: 'Users' },
  { id: 'settings', label: 'Settings' },
];

const Admin = () => {
  const [activeTab, setActiveTab] = useState('shares');
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/api/auth/me`)
      .then(res => setCurrentUser(res.data))
      .catch(() => navigate('/admin/login', { replace: true }));
  }, [navigate]);

  const handleLogout = () => {
    clearToken();
    navigate('/admin/login', { replace: true });
  };

  const canEdit = currentUser?.role === 'admin';

  return (
    <div style={{ width: '100%', alignSelf: 'flex-start' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{
          fontSize: '2rem', fontWeight: 700,
          background: 'linear-gradient(to right, var(--gradient-start), var(--gradient-end))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Admin Panel
        </h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {currentUser && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {currentUser.username}
              <span style={{
                fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '999px',
                background: canEdit ? 'rgba(59,130,246,0.15)' : 'rgba(100,116,139,0.15)',
                color: canEdit ? 'var(--accent)' : 'var(--text-secondary)',
                border: `1px solid ${canEdit ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
              }}>
                {currentUser.role}
              </span>
            </span>
          )}
          <a href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>← Home</a>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
              color: 'var(--danger)', borderRadius: '8px', padding: '0.45rem 0.85rem',
              cursor: 'pointer', fontSize: '0.85rem',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: activeTab === tab.id ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: activeTab === tab.id ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.id ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'shares'   && <SharesTab   canEdit={canEdit} />}
      {activeTab === 'expiry'   && <ExpiryTab   canEdit={canEdit} />}
      {activeTab === 'users'    && <UsersTab    canEdit={canEdit} currentUser={currentUser} />}
      {activeTab === 'settings' && <SettingsTab canEdit={canEdit} />}
    </div>
  );
};

export default Admin;
