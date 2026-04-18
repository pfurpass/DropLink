import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, KeyRound, Check, X, Plus } from 'lucide-react';
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

const UsersTab = ({ currentUser, canEdit }) => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('admin');
  const [editingPw, setEditingPw] = useState(null);
  const [pwValue, setPwValue] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/users`);
      setUsers(res.data);
    } catch {
      setError('Failed to load users.');
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const addUser = async () => {
    if (!newUsername.trim() || !newPassword) return;
    setError('');
    try {
      const res = await axios.post(`${API}/api/admin/users`, {
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
      });
      setUsers(prev => [...prev, res.data]);
      setNewUsername('');
      setNewPassword('');
      setNewRole('admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user.');
    }
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    setError('');
    try {
      await axios.delete(`${API}/api/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user.');
    }
  };

  const savePassword = async (id) => {
    if (!pwValue) return;
    setError('');
    try {
      await axios.patch(`${API}/api/admin/users/${id}/password`, { password: pwValue });
      setEditingPw(null);
      setPwValue('');
    } catch {
      setError('Failed to update password.');
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
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '0.65rem 1.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Username</th>
              <th style={{ textAlign: 'left', padding: '0.65rem 1.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Role</th>
              <th style={{ padding: '0.65rem 1.25rem' }} />
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}
              >
                <td style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}>
                  {user.username}
                  {currentUser?.id === user.id && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: 'var(--accent)', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', padding: '0.1rem 0.4rem', borderRadius: '999px' }}>you</span>
                  )}
                </td>
                <td style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{user.role}</td>
                <td style={{ padding: '0.65rem 1.25rem' }}>
                  {canEdit && <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => { setEditingPw(editingPw === user.id ? null : user.id); setPwValue(''); }}
                      style={{ ...btnBase, padding: '0.3rem 0.6rem', gap: '0.3rem', fontSize: '0.78rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: 'var(--accent)' }}
                    >
                      <KeyRound size={13} /> Password
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      disabled={currentUser?.id === user.id}
                      style={{ ...btnBase, padding: '0.3rem 0.6rem', gap: '0.3rem', fontSize: '0.78rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)', opacity: currentUser?.id === user.id ? 0.35 : 1, cursor: currentUser?.id === user.id ? 'not-allowed' : 'pointer' }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>}

                  <AnimatePresence>
                    {canEdit && editingPw === user.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="password"
                            className="form-control"
                            placeholder="New password"
                            value={pwValue}
                            onChange={e => setPwValue(e.target.value)}
                            style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                          />
                          <button onClick={() => savePassword(user.id)} disabled={!pwValue}
                            style={{ ...btnBase, padding: '0.4rem 0.6rem', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: 'var(--success)', opacity: !pwValue ? 0.4 : 1 }}>
                            <Check size={14} />
                          </button>
                          <button onClick={() => { setEditingPw(null); setPwValue(''); }}
                            style={{ ...btnBase, padding: '0.4rem 0.6rem', background: 'rgba(100,116,139,0.1)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            <X size={14} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {canEdit && <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Username"
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
            style={{ width: '140px', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
          />
          <input
            type="password"
            className="form-control"
            placeholder="Password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            style={{ width: '140px', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
          />
          <select
            className="form-control"
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
            style={{ width: '110px', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
          >
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            onClick={addUser}
            disabled={!newUsername.trim() || !newPassword}
            style={{ ...btnBase, padding: '0.45rem 0.9rem', gap: '0.35rem', fontSize: '0.85rem', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--accent)', opacity: (!newUsername.trim() || !newPassword) ? 0.45 : 1 }}
          >
            <Plus size={14} /> Add User
          </button>
        </div>}
      </div>
    </div>
  );
};

export default UsersTab;
