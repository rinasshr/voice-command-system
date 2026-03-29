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
    background: '#fff', borderRadius: 12, padding: 24,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 20,
  };

  const labelStyle = { padding: '10px 12px', fontWeight: 600, width: 200, color: '#444', verticalAlign: 'top' };
  const valueStyle = { padding: '10px 12px' };
  const inputStyle = {
    width: '100%', padding: '8px 10px', border: '1px solid #ccc',
    borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
  };
  const btnStyle = (bg) => ({
    padding: '10px 24px', fontSize: 14, background: bg, color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
  });

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Запись голосовой команды</h2>

      {/* Instructions */}
      <div style={cardStyle}>
        <p style={{ marginBottom: 12, color: '#555', lineHeight: 1.6 }}>
          Нажмите <b>Начать запись</b> и произнесите команду с параметрами. Примеры:
        </p>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#555', lineHeight: 1.8 }}>
          <li><i>«Зарегистрировать трубу номер Р45345ИВ»</i></li>
          <li><i>«Отменить обработку плавки 21957898»</i></li>
          <li><i>«Начать обработку партии 12345678»</i></li>
          <li><i>«Завершить обработку детали А100Б»</i></li>
        </ul>
      </div>

      {/* Record button */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!recording ? (
            <button
              onClick={startRecording}
              disabled={loading}
              style={{
                ...btnStyle(loading ? '#bbb' : '#d32f2f'),
                padding: '16px 36px', fontSize: 16,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Распознавание...' : 'Начать запись'}
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{
                ...btnStyle('#388e3c'),
                padding: '16px 36px', fontSize: 16,
                animation: 'pulse 1s infinite',
              }}
            >
              Остановить запись
            </button>
          )}
          {recording && (
            <span style={{ color: '#d32f2f', fontWeight: 600, fontSize: 15 }}>
              Запись идёт... Говорите команду
            </span>
          )}
          {loading && (
            <span style={{ color: '#1976d2', fontWeight: 500, fontSize: 14 }}>
              Отправка на сервер и распознавание...
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          ...cardStyle, background: '#ffebee', color: '#c62828',
          border: '1px solid #ef9a9a',
        }}>
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={cardStyle}>
          <h3 style={{ marginBottom: 16, color: '#1a1a1a' }}>Результат распознавания</h3>

          {/* Audio player */}
          {audioUrl && (
            <div style={{
              marginBottom: 16, padding: 12, background: '#f5f5f5',
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: '#444' }}>Аудиозапись:</span>
              <audio controls src={audioUrl} style={{ flex: 1, height: 36 }} />
              <span style={{ fontSize: 12, color: '#888' }}>{result.duration_seconds} сек.</span>
            </div>
          )}

          {editing ? (
            /* Edit mode */
            <div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4, color: '#444' }}>
                  Распознанный текст (корректировка)
                </label>
                <input style={inputStyle} value={editData.corrected_text}
                  onChange={(e) => setEditData({ ...editData, corrected_text: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4, color: '#444' }}>
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
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4, color: '#444' }}>
                    Идентификатор
                  </label>
                  <input style={inputStyle} value={editData.identifier}
                    placeholder="Например: Р45345ИВ или 21957898"
                    onChange={(e) => setEditData({ ...editData, identifier: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleSaveEdit} style={btnStyle('#388e3c')}>Сохранить</button>
                <button onClick={() => setEditing(false)} style={btnStyle('#888')}>Отмена</button>
              </div>
            </div>
          ) : (
            /* Display mode */
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                <tbody>
                  <tr>
                    <td style={labelStyle}>Распознанный текст:</td>
                    <td style={valueStyle}>{result.raw_text || '(пусто)'}</td>
                  </tr>
                  <tr style={{ background: '#f9f9f9' }}>
                    <td style={labelStyle}>Команда:</td>
                    <td style={valueStyle}>
                      {result.command ? (
                        <span style={{
                          background: '#e3f2fd', color: '#1565c0', padding: '4px 12px',
                          borderRadius: 4, fontWeight: 600, fontSize: 14,
                        }}>
                          {result.command}
                        </span>
                      ) : (
                        <span style={{ color: '#999' }}>(не определена)</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={labelStyle}>Идентификатор:</td>
                    <td style={valueStyle}>
                      {result.identifier ? (
                        <span style={{
                          background: '#fff3e0', color: '#e65100', padding: '4px 12px',
                          borderRadius: 4, fontWeight: 600, fontSize: 14, fontFamily: 'monospace',
                        }}>
                          {result.identifier}
                        </span>
                      ) : (
                        <span style={{ color: '#999' }}>(не определён)</span>
                      )}
                    </td>
                  </tr>
                  <tr style={{ background: '#f9f9f9' }}>
                    <td style={labelStyle}>Длительность:</td>
                    <td style={valueStyle}>{result.duration_seconds} сек.</td>
                  </tr>
                  <tr>
                    <td style={labelStyle}>Время записи:</td>
                    <td style={valueStyle}>
                      {new Date(result.created_at).toLocaleString('ru-RU')}
                    </td>
                  </tr>
                  <tr style={{ background: '#f9f9f9' }}>
                    <td style={labelStyle}>Оператор:</td>
                    <td style={valueStyle}>{localStorage.getItem('username')}</td>
                  </tr>
                  <tr>
                    <td style={labelStyle}>Статус:</td>
                    <td style={valueStyle}>
                      {confirmed ? (
                        <span style={{ color: '#388e3c', fontWeight: 600 }}>Подтверждено</span>
                      ) : (
                        <span style={{ color: '#f57c00', fontWeight: 500 }}>Ожидает подтверждения</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: 10 }}>
                {!confirmed && (
                  <button onClick={handleConfirm} style={btnStyle('#388e3c')}>
                    Подтвердить результат
                  </button>
                )}
                <button onClick={handleStartEdit} style={btnStyle('#f57c00')}>
                  Скорректировать
                </button>
                <button onClick={startRecording} disabled={loading} style={btnStyle('#1976d2')}>
                  Новая запись
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
