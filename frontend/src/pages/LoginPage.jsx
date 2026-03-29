import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const validateFields = () => {
    const errors = {};
    const trimmed = username.trim();

    if (!trimmed) {
      errors.username = 'Введите логин';
    } else if (trimmed.length < 3) {
      errors.username = 'Минимум 3 символа';
    } else if (trimmed.length > 30) {
      errors.username = 'Максимум 30 символов';
    } else if (!/^[a-zA-Zа-яА-ЯёЁ0-9]+$/.test(trimmed)) {
      errors.username = 'Только буквы и цифры';
    }

    if (!password) {
      errors.password = 'Введите пароль';
    } else if (password.length < 4) {
      errors.password = 'Минимум 4 символа';
    }

    if (isRegister && password !== passwordConfirm) {
      errors.passwordConfirm = 'Пароли не совпадают';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateFields()) return;

    setLoading(true);
    try {
      if (isRegister) {
        await api.post('/auth/register', {
          username: username.trim(),
          password,
        });
        setSuccess('Регистрация прошла успешно! Выполняется вход...');
      }

      const params = new URLSearchParams();
      params.append('username', username.trim());
      params.append('password', password);
      const { data } = await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('username', data.username);

      if (onLogin) onLogin();
      setTimeout(() => navigate('/'), isRegister ? 800 : 0);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const status = err.response?.status;
      let msg;

      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((d) => d.msg || d).join('; ');
      } else if (!err.response) {
        msg = 'Нет соединения с сервером. Проверьте подключение';
      } else if (status === 500) {
        msg = 'Внутренняя ошибка сервера. Попробуйте позже';
      } else {
        msg = 'Произошла непредвиденная ошибка';
      }

      setError(msg);
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setSuccess('');
    setFieldErrors({});
    setPasswordConfirm('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        padding: 40,
        background: '#fff',
        borderRadius: 24,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
          }}>
            🎤
          </div>
          <h1 style={{ margin: 0, fontSize: 26, color: '#1a1a1a', fontWeight: 700 }}>
            Voice Commands
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#888' }}>
            Система распознавания голосовых команд
          </p>
        </div>

        <div style={{
          display: 'flex',
          background: '#f5f5f5',
          borderRadius: 12,
          padding: 4,
          marginBottom: 28,
        }}>
          <button
            type="button"
            onClick={() => !isRegister || switchMode()}
            style={{
              flex: 1,
              padding: '12px 20px',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: !isRegister ? 'white' : 'transparent',
              color: !isRegister ? '#667eea' : '#888',
              boxShadow: !isRegister ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => isRegister || switchMode()}
            style={{
              flex: 1,
              padding: '12px 20px',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: isRegister ? 'white' : 'transparent',
              color: isRegister ? '#667eea' : '#888',
              boxShadow: isRegister ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Username */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', marginBottom: 8, fontSize: 13,
              fontWeight: 600, color: '#333',
            }}>
              Логин
            </label>
            <input
              style={{
                width: '100%',
                padding: '14px 16px',
                border: `2px solid ${fieldErrors.username ? '#e53935' : '#e0e0e0'}`,
                borderRadius: 12,
                fontSize: 15,
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                background: '#fafafa',
              }}
              placeholder="Введите логин"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) setFieldErrors({ ...fieldErrors, username: '' });
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = fieldErrors.username ? '#e53935' : '#e0e0e0'}
              autoComplete="username"
              autoFocus
            />
            {fieldErrors.username && (
              <p style={{ color: '#e53935', fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                ⚠️ {fieldErrors.username}
              </p>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', marginBottom: 8, fontSize: 13,
              fontWeight: 600, color: '#333',
            }}>
              Пароль
            </label>
            <div style={{ position: 'relative' }}>
              <input
                style={{
                  width: '100%',
                  padding: '14px 50px 14px 16px',
                  border: `2px solid ${fieldErrors.password ? '#e53935' : '#e0e0e0'}`,
                  borderRadius: 12,
                  fontSize: 15,
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  background: '#fafafa',
                }}
                type={showPassword ? 'text' : 'password'}
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = fieldErrors.password ? '#e53935' : '#e0e0e0'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 18,
                  padding: 4,
                  opacity: 0.6,
                }}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {fieldErrors.password && (
              <p style={{ color: '#e53935', fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                ⚠️ {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Password confirm (register only) */}
          {isRegister && (
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block', marginBottom: 8, fontSize: 13,
                fontWeight: 600, color: '#333',
              }}>
                Подтверждение пароля
              </label>
              <input
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: `2px solid ${fieldErrors.passwordConfirm ? '#e53935' : '#e0e0e0'}`,
                  borderRadius: 12,
                  fontSize: 15,
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  background: '#fafafa',
                }}
                type={showPassword ? 'text' : 'password'}
                placeholder="Повторите пароль"
                value={passwordConfirm}
                onChange={(e) => {
                  setPasswordConfirm(e.target.value);
                  if (fieldErrors.passwordConfirm)
                    setFieldErrors({ ...fieldErrors, passwordConfirm: '' });
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = fieldErrors.passwordConfirm ? '#e53935' : '#e0e0e0'}
                autoComplete="new-password"
              />
              {fieldErrors.passwordConfirm && (
                <p style={{ color: '#e53935', fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ⚠️ {fieldErrors.passwordConfirm}
                </p>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={{
              background: '#ffebee',
              color: '#c62828',
              padding: '14px 16px',
              borderRadius: 12,
              fontSize: 14,
              marginBottom: 20,
              border: '1px solid #ffcdd2',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>❌</span>
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div style={{
              background: '#e8f5e9',
              color: '#2e7d32',
              padding: '14px 16px',
              borderRadius: 12,
              fontSize: 14,
              marginBottom: 20,
              border: '1px solid #c8e6c9',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>✅</span>
              {success}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 16,
              background: loading
                ? '#bdbdbd'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)',
            }}
          >
            {loading
              ? (isRegister ? '⏳ Регистрация...' : '⏳ Вход...')
              : (isRegister ? 'Создать аккаунт' : 'Войти в систему')}
          </button>
        </form>

        {/* Footer hint */}
        <p style={{
          textAlign: 'center',
          marginTop: 24,
          fontSize: 13,
          color: '#999',
        }}>
          {isRegister
            ? 'После регистрации вы сможете записывать голосовые команды'
            : 'Введите данные для входа в систему'}
        </p>
      </div>
    </div>
  );
}
