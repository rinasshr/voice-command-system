import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await api.post('/auth/register', { username, password });
      }
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);
      const { data } = await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('username', data.username);
      navigate('/');
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : JSON.stringify(detail);
      setError(msg || err.message || 'Ошибка соединения с сервером');
    }
  };

  const cardStyle = {
    maxWidth: 380, margin: '80px auto', padding: 32, background: '#fff',
    borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', marginBottom: 12, border: '1px solid #ccc',
    borderRadius: 6, fontSize: 15, boxSizing: 'border-box',
  };

  const btnStyle = {
    width: '100%', padding: 12, background: '#1976d2', color: '#fff',
    border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer', fontWeight: 600,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={cardStyle}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>
          {isRegister ? 'Регистрация' : 'Вход в систему'}
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            style={inputStyle}
            placeholder="Логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}
          <button style={btnStyle} type="submit">
            {isRegister ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={() => setIsRegister(!isRegister)}
            style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontSize: 14 }}
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </p>
      </div>
    </div>
  );
}
