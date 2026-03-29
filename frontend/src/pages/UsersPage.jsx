import { useState, useEffect } from 'react';
import api from '../api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'operator' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    const { data } = await api.get('/users');
    setUsers(data);
  };

  useEffect(() => { fetchUsers(); }, []);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const createUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', newUser);
      showSuccess(`Пользователь "${newUser.username}" создан`);
      setNewUser({ username: '', password: '', role: 'operator' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка создания пользователя');
    }
  };

  const toggleActive = async (user) => {
    const action = user.is_active ? 'заблокирован' : 'разблокирован';
    await api.put(`/users/${user.id}`, { is_active: !user.is_active });
    showSuccess(`Пользователь "${user.username}" ${action}`);
    fetchUsers();
  };

  const changeRole = async (user, role) => {
    await api.put(`/users/${user.id}`, { role });
    const roleLabel = role === 'admin' ? 'Администратор' : 'Оператор';
    showSuccess(`Роль пользователя "${user.username}" изменена на "${roleLabel}"`);
    fetchUsers();
  };

  const cardStyle = {
    background: '#fff', borderRadius: 12, padding: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 16,
  };

  const inputStyle = {
    padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14,
  };

  const labelStyle = { fontSize: 12, display: 'block', marginBottom: 4, color: '#555', fontWeight: 600 };

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Управление пользователями</h2>

      {/* Success / Error notifications */}
      {success && (
        <div style={{
          background: '#e8f5e9', color: '#2e7d32', padding: '10px 16px',
          borderRadius: 8, marginBottom: 12, border: '1px solid #a5d6a7', fontSize: 14,
        }}>
          {success}
        </div>
      )}

      {/* Create user form */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: 14 }}>Создать пользователя</h3>
        <form onSubmit={createUser} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Логин</label>
            <input style={inputStyle} value={newUser.username} required
              placeholder="Введите логин"
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Пароль</label>
            <input style={inputStyle} type="password" value={newUser.password} required
              placeholder="Введите пароль"
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Роль</label>
            <select style={inputStyle} value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
              <option value="operator">Оператор</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
          <button type="submit" style={{
            padding: '8px 24px', background: '#1976d2', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, height: 38,
          }}>Создать</button>
        </form>
        {error && (
          <div style={{
            background: '#ffebee', color: '#c62828', padding: '8px 14px',
            borderRadius: 6, marginTop: 10, border: '1px solid #ef9a9a', fontSize: 13,
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Users table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#e3f2fd' }}>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>ID</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>Логин</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>Роль</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>Статус</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>Создан</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: 10, fontSize: 14 }}>{u.id}</td>
                <td style={{ padding: 10, fontSize: 14, fontWeight: 600 }}>{u.username}</td>
                <td style={{ padding: 10 }}>
                  <select value={u.role} onChange={(e) => changeRole(u, e.target.value)} style={inputStyle}>
                    <option value="operator">Оператор</option>
                    <option value="admin">Администратор</option>
                  </select>
                </td>
                <td style={{ padding: 10 }}>
                  <span style={{
                    color: u.is_active ? '#388e3c' : '#d32f2f', fontWeight: 600, fontSize: 13,
                    background: u.is_active ? '#e8f5e9' : '#ffebee',
                    padding: '3px 10px', borderRadius: 4,
                  }}>
                    {u.is_active ? 'Активен' : 'Заблокирован'}
                  </span>
                </td>
                <td style={{ padding: 10, fontSize: 13, color: '#888' }}>
                  {new Date(u.created_at).toLocaleString('ru-RU')}
                </td>
                <td style={{ padding: 10 }}>
                  <button onClick={() => toggleActive(u)} style={{
                    padding: '6px 14px',
                    background: u.is_active ? '#d32f2f' : '#388e3c',
                    color: '#fff', border: 'none', borderRadius: 6,
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}>
                    {u.is_active ? 'Заблокировать' : 'Разблокировать'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
