import { useState, useRef } from 'react';
import api from '../api';

export default function MainPage() {
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ corrected_text: '', command: '', identifier: '' });
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

  const startRecording = async () => {
    setError('');
    setResult(null);
    setConfirmed(false);
    setEditing(false);
    setAudioUrl(null);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        // Create local playback URL
        setAudioUrl(URL.createObjectURL(blob));
        await uploadAudio(blob);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      setError('Нет доступа к микрофону. Разрешите доступ в настройках браузера.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadAudio = async (blob) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    try {
      const { data } = await api.post('/records/upload', formData);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка распознавания');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!result) return;
    try {
      await api.put(`/records/${result.id}/confirm`);
      setConfirmed(true);
    } catch {
      setError('Не удалось подтвердить запись');
    }
  };

  const handleStartEdit = () => {
    setEditing(true);
    setEditData({
      corrected_text: result.raw_text,
      command: result.command || '',
      identifier: result.identifier || '',
    });
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/records/${result.id}/correct`, editData);
      setResult({
        ...result,
        raw_text: editData.corrected_text,
        command: editData.command,
        identifier: editData.identifier,
      });
      setEditing(false);
    } catch {
      setError('Не удалось сохранить корректировку');
    }
  };

  const cardStyle = {
    background: '#fff',
    borderRadius: 16,
    padding: 28,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    marginBottom: 24,
    border: '1px solid rgba(0,0,0,0.05)',
  };

  const labelStyle = {
    padding: '12px 16px',
    fontWeight: 600,
    width: 180,
    color: '#555',
    verticalAlign: 'top',
    fontSize: 14,
  };
  const valueStyle = {
    padding: '12px 16px',
    fontSize: 15,
  };
  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: '2px solid #e0e0e0',
    borderRadius: 10,
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s',
    background: '#fafafa',
  };
  const btnStyle = (bg, shadow = true) => ({
    padding: '12px 28px',
    fontSize: 14,
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
    boxShadow: shadow ? `0 4px 12px ${bg}40` : 'none',
    transition: 'all 0.2s',
  });

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 700,
          color: '#1a1a1a',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{
            width: 48,
            height: 48,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}>
            🎤
          </span>
          Запись голосовой команды
        </h2>
        <p style={{ margin: '8px 0 0 60px', color: '#666', fontSize: 15 }}>
          Произнесите команду для регистрации или обработки
        </p>
      </div>

      {/* Instructions */}
      <div style={{
        ...cardStyle,
        background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)',
        border: '1px solid #c8e6c9',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <span style={{ fontSize: 32 }}>💡</span>
          <div>
            <p style={{ marginBottom: 12, color: '#2e7d32', fontWeight: 600, fontSize: 15 }}>
              Примеры голосовых команд:
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px 24px',
            }}>
              {[
                '«Зарегистрировать трубу номер Р45345ИВ»',
                '«Отменить обработку плавки 21957898»',
                '«Начать обработку партии 12345678»',
                '«Завершить обработку детали А100Б»',
              ].map((ex, i) => (
                <div key={i} style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.7)',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#33691e',
                  fontStyle: 'italic',
                }}>
                  {ex}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Record button */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {!recording ? (
            <button
              onClick={startRecording}
              disabled={loading}
              style={{
                padding: '18px 48px',
                fontSize: 17,
                background: loading
                  ? '#bdbdbd'
                  : 'linear-gradient(135deg, #e53935 0%, #d32f2f 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                boxShadow: loading ? 'none' : '0 6px 20px rgba(229, 57, 53, 0.4)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 22 }}>{loading ? '⏳' : '🎙️'}</span>
              {loading ? 'Распознавание...' : 'Начать запись'}
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{
                padding: '18px 48px',
                fontSize: 17,
                background: 'linear-gradient(135deg, #43a047 0%, #388e3c 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                cursor: 'pointer',
                fontWeight: 700,
                boxShadow: '0 6px 20px rgba(67, 160, 71, 0.4)',
                animation: 'pulse 1.5s infinite',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 22 }}>⏹️</span>
              Остановить запись
            </button>
          )}
          {recording && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 20px',
              background: '#ffebee',
              borderRadius: 10,
            }}>
              <div style={{
                width: 12,
                height: 12,
                background: '#e53935',
                borderRadius: '50%',
                animation: 'blink 1s infinite',
              }} />
              <span style={{ color: '#c62828', fontWeight: 600, fontSize: 15 }}>
                Запись идёт... Говорите команду
              </span>
            </div>
          )}
          {loading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 20px',
              background: '#e3f2fd',
              borderRadius: 10,
            }}>
              <div style={{
                width: 20,
                height: 20,
                border: '3px solid #e3f2fd',
                borderTop: '3px solid #1976d2',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <span style={{ color: '#1565c0', fontWeight: 500, fontSize: 14 }}>
                Распознавание речи...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          ...cardStyle,
          background: 'linear-gradient(135deg, #ffebee 0%, #fce4ec 100%)',
          color: '#c62828',
          border: '1px solid #ffcdd2',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 24 }}>❌</span>
          <span style={{ fontSize: 15 }}>{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={cardStyle}>
          <h3 style={{
            marginBottom: 20,
            color: '#1a1a1a',
            fontSize: 20,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span>📋</span>
            Результат распознавания
          </h3>

          {/* Audio player */}
          {audioUrl && (
            <div style={{
              marginBottom: 20,
              padding: 16,
              background: 'linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <span style={{ fontSize: 24 }}>🔊</span>
              <audio controls src={audioUrl} style={{ flex: 1, height: 40 }} />
              <span style={{
                fontSize: 13,
                color: '#666',
                padding: '6px 12px',
                background: 'white',
                borderRadius: 20,
                fontWeight: 600,
              }}>
                {result.duration_seconds} сек.
              </span>
            </div>
          )}

          {editing ? (
            /* Edit mode */
            <div style={{ background: '#fafafa', padding: 20, borderRadius: 12 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444' }}>
                  Распознанный текст (корректировка)
                </label>
                <input style={inputStyle} value={editData.corrected_text}
                  onChange={(e) => setEditData({ ...editData, corrected_text: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444' }}>
                    Команда
                  </label>
                  <select style={inputStyle} value={editData.command}
                    onChange={(e) => setEditData({ ...editData, command: e.target.value })}>
                    <option value="">— не определена —</option>
                    <option value="зарегистрировать">Зарегистрировать</option>
                    <option value="начать обработку">Начать обработку</option>
                    <option value="отменить обработку">Отменить обработку</option>
                    <option value="отменить регистрацию">Отменить регистрацию</option>
                    <option value="завершить обработку">Завершить обработку</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444' }}>
                    Идентификатор
                  </label>
                  <input style={inputStyle} value={editData.identifier}
                    placeholder="Например: Р45345ИВ"
                    onChange={(e) => setEditData({ ...editData, identifier: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={handleSaveEdit} style={btnStyle('#43a047')}>
                  ✓ Сохранить
                </button>
                <button onClick={() => setEditing(false)} style={btnStyle('#757575')}>
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            /* Display mode */
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                <tbody>
                  <tr>
                    <td style={labelStyle}>Распознанный текст:</td>
                    <td style={valueStyle}>
                      <span style={{ lineHeight: 1.6 }}>{result.raw_text || '(пусто)'}</span>
                    </td>
                  </tr>
                  <tr style={{ background: '#fafafa' }}>
                    <td style={labelStyle}>Команда:</td>
                    <td style={valueStyle}>
                      {result.command ? (
                        <span style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: '#fff',
                          padding: '6px 16px',
                          borderRadius: 20,
                          fontWeight: 600,
                          fontSize: 13,
                          display: 'inline-block',
                        }}>
                          {result.command}
                        </span>
                      ) : (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>(не определена)</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={labelStyle}>Идентификатор:</td>
                    <td style={valueStyle}>
                      {result.identifier ? (
                        <span style={{
                          background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                          color: '#fff',
                          padding: '6px 16px',
                          borderRadius: 20,
                          fontWeight: 700,
                          fontSize: 15,
                          fontFamily: 'monospace',
                          letterSpacing: 1,
                          display: 'inline-block',
                        }}>
                          {result.identifier}
                        </span>
                      ) : (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>(не определён)</span>
                      )}
                    </td>
                  </tr>
                  <tr style={{ background: '#fafafa' }}>
                    <td style={labelStyle}>Время записи:</td>
                    <td style={valueStyle}>
                      {new Date(result.created_at).toLocaleString('ru-RU')}
                    </td>
                  </tr>
                  <tr>
                    <td style={labelStyle}>Статус:</td>
                    <td style={valueStyle}>
                      {confirmed ? (
                        <span style={{
                          background: '#e8f5e9',
                          color: '#2e7d32',
                          padding: '6px 16px',
                          borderRadius: 20,
                          fontWeight: 600,
                          fontSize: 13,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                          ✓ Подтверждено
                        </span>
                      ) : (
                        <span style={{
                          background: '#fff3e0',
                          color: '#e65100',
                          padding: '6px 16px',
                          borderRadius: 20,
                          fontWeight: 500,
                          fontSize: 13,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                          ⏳ Ожидает подтверждения
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {!confirmed && (
                  <button onClick={handleConfirm} style={btnStyle('#43a047')}>
                    ✓ Подтвердить результат
                  </button>
                )}
                <button onClick={handleStartEdit} style={btnStyle('#ff9800')}>
                  ✏️ Скорректировать
                </button>
                <button onClick={startRecording} disabled={loading} style={btnStyle('#667eea')}>
                  🎙️ Новая запись
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(0.98); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
