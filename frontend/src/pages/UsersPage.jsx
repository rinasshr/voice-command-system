import { useState, useEffect } from 'react';
import api from '../api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'operator' });
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    const { data } = await api.get('/users');
    setUsers(data);
  };

  useEffect(() => { fetchUsers(); }, []);

  const createUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', newUser);
      setNewUser({ username: '', password: '', role: 'operator' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка');
    }
  };

  const toggleActive = async (user) => {
    await api.put(`/users/${user.id}`, { is_active: !user.is_active });
    fetchUsers();
  };

  const changeRole = async (user, role) => {
    await api.put(`/users/${user.id}`, { role });
    fetchUsers();
  };

  const cardStyle = {
    background: '#fff', borderRadius: 12, padding: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 16,
  };

  const inputStyle = {
    padding: '8px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: 14,
  };

  return (
    <div>
      <h2>Управление пользователями</h2>

      <div style={cardStyle}>
        <h3>Создать пользователя</h3>
        <form onSubmit={createUser} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 12, display: 'block' }}>Логин</label>
            <input style={inputStyle} value={newUser.username} required
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, display: 'block' }}>Пароль</label>
            <input style={inputStyle} type="password" value={newUser.password} required
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, display: 'block' }}>Роль</label>
            <select style={inputStyle} value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
              <option value="operator">Оператор</option>
              <option value="admin">Админ</option>
            </select>
          </div>
          <button type="submit" style={{
            padding: '8px 20px', background: '#1976d2', color: '#fff',
            border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600, height: 38,
          }}>Создать</button>
        </form>
        {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
      </div>

      <table style={{ width: '100%', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <thead>
          <tr style={{ background: '#e3f2fd' }}>
            <th style={{ padding: 10, textAlign: 'left' }}>ID</th>
            <th style={{ padding: 10, textAlign: 'left' }}>Логин</th>
            <th style={{ padding: 10, textAlign: 'left' }}>Роль</th>
            <th style={{ padding: 10, textAlign: 'left' }}>Статус</th>
            <th style={{ padding: 10, textAlign: 'left' }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: 10 }}>{u.id}</td>
              <td style={{ padding: 10 }}>{u.username}</td>
              <td style={{ padding: 10 }}>
                <select value={u.role} onChange={(e) => changeRole(u, e.target.value)} style={inputStyle}>
                  <option value="operator">Оператор</option>
                  <option value="admin">Админ</option>
                </select>
              </td>
              <td style={{ padding: 10 }}>
                <span style={{ color: u.is_active ? '#388e3c' : '#d32f2f', fontWeight: 600 }}>
                  {u.is_active ? 'Активен' : 'Заблокирован'}
                </span>
              </td>
              <td style={{ padding: 10 }}>
                <button onClick={() => toggleActive(u)} style={{
                  padding: '5px 12px', background: u.is_active ? '#d32f2f' : '#388e3c',
                  color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13,
                }}>
                  {u.is_active ? 'Заблокировать' : 'Разблокировать'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
