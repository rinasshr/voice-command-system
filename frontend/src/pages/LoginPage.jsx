import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function LoginPage() {
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
      background: 'linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: 400,
        padding: 36,
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#1976d2', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, color: '#fff',
          }}>
            {isRegister ? '+' : '\u2192'}
          </div>
          <h2 style={{ margin: 0, fontSize: 22, color: '#1a1a1a' }}>
            {isRegister ? 'Создание аккаунта' : 'Вход в систему'}
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#888' }}>
            {isRegister
              ? 'Заполните данные для регистрации'
              : 'Введите логин и пароль для входа'}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Username */}
          <div style={{ marginBottom: 18 }}>
            <label style={{
              display: 'block', marginBottom: 6, fontSize: 13,
              fontWeight: 600, color: '#444',
            }}>
              Логин
            </label>
            <input
              style={{
                width: '100%', padding: '11px 14px',
                border: `1.5px solid ${fieldErrors.username ? '#d32f2f' : '#ddd'}`,
                borderRadius: 8, fontSize: 15, boxSizing: 'border-box',
                outline: 'none', transition: 'border-color 0.2s',
              }}
              placeholder="Введите логин"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) setFieldErrors({ ...fieldErrors, username: '' });
              }}
              autoComplete="username"
              autoFocus
            />
            {fieldErrors.username && (
              <p style={{ color: '#d32f2f', fontSize: 12, marginTop: 4 }}>
                {fieldErrors.username}
              </p>
            )}
            {isRegister && !fieldErrors.username && (
              <p style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                Буквы и цифры, от 3 до 30 символов
              </p>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 18 }}>
            <label style={{
              display: 'block', marginBottom: 6, fontSize: 13,
              fontWeight: 600, color: '#444',
            }}>
              Пароль
            </label>
            <div style={{ position: 'relative' }}>
              <input
                style={{
                  width: '100%', padding: '11px 44px 11px 14px',
                  border: `1.5px solid ${fieldErrors.password ? '#d32f2f' : '#ddd'}`,
                  borderRadius: 8, fontSize: 15, boxSizing: 'border-box',
                  outline: 'none', transition: 'border-color 0.2s',
                }}
                type={showPassword ? 'text' : 'password'}
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                }}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#888', padding: 4,
                }}
                tabIndex={-1}
              >
                {showPassword ? 'Скрыть' : 'Показать'}
              </button>
            </div>
            {fieldErrors.password && (
              <p style={{ color: '#d32f2f', fontSize: 12, marginTop: 4 }}>
                {fieldErrors.password}
              </p>
            )}
            {isRegister && !fieldErrors.password && (
              <p style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                Минимум 4 символа
              </p>
            )}
          </div>

          {/* Password confirm (register only) */}
          {isRegister && (
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block', marginBottom: 6, fontSize: 13,
                fontWeight: 600, color: '#444',
              }}>
                Подтверждение пароля
              </label>
              <input
                style={{
                  width: '100%', padding: '11px 14px',
                  border: `1.5px solid ${fieldErrors.passwordConfirm ? '#d32f2f' : '#ddd'}`,
                  borderRadius: 8, fontSize: 15, boxSizing: 'border-box',
                  outline: 'none', transition: 'border-color 0.2s',
                }}
                type={showPassword ? 'text' : 'password'}
                placeholder="Повторите пароль"
                value={passwordConfirm}
                onChange={(e) => {
                  setPasswordConfirm(e.target.value);
                  if (fieldErrors.passwordConfirm)
                    setFieldErrors({ ...fieldErrors, passwordConfirm: '' });
                }}
                autoComplete="new-password"
              />
              {fieldErrors.passwordConfirm && (
                <p style={{ color: '#d32f2f', fontSize: 12, marginTop: 4 }}>
                  {fieldErrors.passwordConfirm}
                </p>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={{
              background: '#ffebee', color: '#c62828', padding: '10px 14px',
              borderRadius: 8, fontSize: 14, marginBottom: 16,
              border: '1px solid #ef9a9a',
            }}>
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div style={{
              background: '#e8f5e9', color: '#2e7d32', padding: '10px 14px',
              borderRadius: 8, fontSize: 14, marginBottom: 16,
              border: '1px solid #a5d6a7',
            }}>
              {success}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: 13,
              background: loading ? '#90caf9' : '#1976d2',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600, transition: 'background 0.2s',
            }}
          >
            {loading
              ? (isRegister ? 'Регистрация...' : 'Вход...')
              : (isRegister ? 'Зарегистрироваться' : 'Войти')}
          </button>
        </form>

        {/* Switch mode */}
        <div style={{
          textAlign: 'center', marginTop: 20, paddingTop: 16,
          borderTop: '1px solid #eee',
        }}>
          <span style={{ fontSize: 14, color: '#666' }}>
            {isRegister ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}
          </span>
          {' '}
          <button
            onClick={switchMode}
            style={{
              background: 'none', border: 'none', color: '#1976d2',
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
              textDecoration: 'underline',
            }}
          >
            {isRegister ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </div>
      </div>
    </div>
  );
}
