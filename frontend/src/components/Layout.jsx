import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';

export default function Layout({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  const logout = () => {
    localStorage.clear();
    if (onLogout) onLogout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const navLinkStyle = (path) => ({
    color: '#fff',
    textDecoration: 'none',
    padding: '8px 16px',
    borderRadius: 8,
    background: isActive(path) ? 'rgba(255,255,255,0.2)' : 'transparent',
    transition: 'all 0.2s',
    fontWeight: isActive(path) ? 600 : 400,
  });

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)' }}>
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '16px 32px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        fontSize: 15,
        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginRight: 32,
        }}>
          <div style={{
            width: 40,
            height: 40,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}>
            🎤
          </div>
          <strong style={{ fontSize: 18, letterSpacing: '-0.5px' }}>Voice Commands</strong>
        </div>
        
        <Link to="/" style={navLinkStyle('/')}>
          📝 Запись
        </Link>
        <Link to="/history" style={navLinkStyle('/history')}>
          📋 История
        </Link>
        {role === 'admin' && (
          <Link to="/users" style={navLinkStyle('/users')}>
            👥 Пользователи
          </Link>
        )}
        
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 20,
          }}>
            <div style={{
              width: 32,
              height: 32,
              background: 'rgba(255,255,255,0.3)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
            }}>
              {username?.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: 500 }}>{username}</span>
            <span style={{
              fontSize: 11,
              padding: '3px 8px',
              background: role === 'admin' ? '#ffd700' : 'rgba(255,255,255,0.3)',
              color: role === 'admin' ? '#333' : '#fff',
              borderRadius: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
            }}>
              {role === 'admin' ? 'Админ' : 'Оператор'}
            </span>
          </div>
          <button onClick={logout} style={{
            background: 'rgba(255,255,255,0.2)',
            color: '#fff',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: 8,
            padding: '8px 20px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            transition: 'all 0.2s',
          }}>
            Выйти
          </button>
        </div>
      </nav>
      <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
        <Outlet />
      </div>
    </div>
  );
}
