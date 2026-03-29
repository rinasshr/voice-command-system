import { Outlet, Link, useNavigate } from 'react-router-dom';

export default function Layout() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', gap: 20, padding: '12px 24px',
        background: '#1976d2', color: '#fff', fontSize: 15
      }}>
        <strong style={{ fontSize: 18 }}>Voice Commands</strong>
        <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>Запись</Link>
        <Link to="/history" style={{ color: '#fff', textDecoration: 'none' }}>История</Link>
        {role === 'admin' && (
          <Link to="/users" style={{ color: '#fff', textDecoration: 'none' }}>Пользователи</Link>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>{username} ({role})</span>
          <button onClick={logout} style={{
            background: '#fff', color: '#1976d2', border: 'none', borderRadius: 4,
            padding: '6px 14px', cursor: 'pointer', fontWeight: 600
          }}>Выйти</button>
        </div>
      </nav>
      <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
        <Outlet />
      </div>
    </div>
  );
}
