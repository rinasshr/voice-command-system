import { useState, useRef } from 'react';
import api from '../api';

export default function MainPage() {
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    setError('');
    setResult(null);
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

  const cardStyle = {
    background: '#fff', borderRadius: 12, padding: 24,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 20,
  };

  return (
    <div>
      <h2>Запись голосовой команды</h2>
      <div style={cardStyle}>
        <p style={{ marginBottom: 16, color: '#555' }}>
          Нажмите кнопку и произнесите команду, например:<br />
          <i>"Зарегистрировать трубу номер Р45345ИВ"</i> или <i>"Отменить обработку плавки 21957898"</i>
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          {!recording ? (
            <button
              onClick={startRecording}
              disabled={loading}
              style={{
                padding: '14px 32px', fontSize: 16, background: '#d32f2f', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
              }}
            >
              {loading ? 'Распознавание...' : 'Начать запись'}
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{
                padding: '14px 32px', fontSize: 16, background: '#388e3c', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
                animation: 'pulse 1s infinite',
              }}
            >
              Остановить запись
            </button>
          )}
        </div>
        {recording && (
          <p style={{ marginTop: 12, color: '#d32f2f', fontWeight: 600 }}>
            Запись идёт... Говорите команду
          </p>
        )}
      </div>

      {error && (
        <div style={{ ...cardStyle, background: '#ffebee', color: '#c62828' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={cardStyle}>
          <h3>Результат распознавания</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: 8, fontWeight: 600, width: 180 }}>Распознанный текст:</td>
                <td style={{ padding: 8 }}>{result.raw_text || '(пусто)'}</td>
              </tr>
              <tr style={{ background: '#f5f5f5' }}>
                <td style={{ padding: 8, fontWeight: 600 }}>Команда:</td>
                <td style={{ padding: 8 }}>{result.command || '(не определена)'}</td>
              </tr>
              <tr>
                <td style={{ padding: 8, fontWeight: 600 }}>Идентификатор:</td>
                <td style={{ padding: 8 }}>{result.identifier || '(не определён)'}</td>
              </tr>
              <tr style={{ background: '#f5f5f5' }}>
                <td style={{ padding: 8, fontWeight: 600 }}>Длительность:</td>
                <td style={{ padding: 8 }}>{result.duration_seconds} сек.</td>
              </tr>
            </tbody>
          </table>
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
