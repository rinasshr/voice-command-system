import { useState, useEffect } from 'react';
import api from '../api';

export default function HistoryPage() {
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({ command: '', identifier: '', date_from: '', date_to: '', username: '' });
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({ corrected_text: '', command: '', identifier: '' });
  const [expanded, setExpanded] = useState(null);
  const [audioUrls, setAudioUrls] = useState({});
  const role = localStorage.getItem('role');

  const fetchRecords = async () => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    const { data } = await api.get('/records', { params });
    setRecords(data);
  };

  useEffect(() => { fetchRecords(); }, []);

  const loadAudio = async (id) => {
    if (audioUrls[id]) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/records/${id}/audio`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    setAudioUrls((prev) => ({ ...prev, [id]: URL.createObjectURL(blob) }));
  };

  const toggleExpand = async (id) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      await loadAudio(id);
    }
  };

  const startEdit = (record) => {
    setEditing(record.id);
    setEditData({
      corrected_text: record.corrected_text || record.raw_text,
      command: record.command || '',
      identifier: record.identifier || '',
    });
  };

  const saveEdit = async (id) => {
    await api.put(`/records/${id}/correct`, editData);
    setEditing(null);
    fetchRecords();
  };

  const confirmRecord = async (id) => {
    await api.put(`/records/${id}/confirm`);
    fetchRecords();
  };

  const inputStyle = {
    padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14,
    boxSizing: 'border-box',
  };

  const cardStyle = {
    background: '#fff', borderRadius: 12, padding: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 12,
  };

  const labelStyle = { fontSize: 12, display: 'block', marginBottom: 4, color: '#555', fontWeight: 600 };

  const btnStyle = (bg) => ({
    padding: '7px 16px', background: bg, color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
  });

  const commandLabel = (cmd) => {
    const map = {
      'зарегистрировать': { bg: '#e3f2fd', color: '#1565c0' },
      'начать обработку': { bg: '#e8f5e9', color: '#2e7d32' },
      'отменить обработку': { bg: '#fff3e0', color: '#e65100' },
      'отменить регистрацию': { bg: '#fce4ec', color: '#c62828' },
      'завершить обработку': { bg: '#f3e5f5', color: '#6a1b9a' },
    };
    const s = map[cmd] || { bg: '#eee', color: '#444' };
    return (
      <span style={{
        background: s.bg, color: s.color, padding: '3px 10px',
        borderRadius: 4, fontWeight: 600, fontSize: 13,
      }}>
        {cmd}
      </span>
    );
  };

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>История записей</h2>

      {/* Filters */}
      <div style={{ ...cardStyle, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <label style={labelStyle}>Команда</label>
          <select style={{ ...inputStyle, minWidth: 180 }} value={filters.command}
            onChange={(e) => setFilters({ ...filters, command: e.target.value })}>
            <option value="">Все команды</option>
            <option value="зарегистрировать">Зарегистрировать</option>
            <option value="начать обработку">Начать обработку</option>
            <option value="отменить обработку">Отменить обработку</option>
            <option value="отменить регистрацию">Отменить регистрацию</option>
            <option value="завершить обработку">Завершить обработку</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Идентификатор</label>
          <input style={inputStyle} placeholder="Например: Р45345ИВ" value={filters.identifier}
            onChange={(e) => setFilters({ ...filters, identifier: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle}>Дата от</label>
          <input style={inputStyle} type="date" value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle}>Дата до</label>
          <input style={inputStyle} type="date" value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
        </div>
        {role === 'admin' && (
          <div>
            <label style={labelStyle}>Оператор</label>
            <input style={inputStyle} placeholder="Логин" value={filters.username}
              onChange={(e) => setFilters({ ...filters, username: e.target.value })} />
          </div>
        )}
        <button onClick={fetchRecords} style={btnStyle('#1976d2')}>Найти</button>
        <button onClick={() => {
          setFilters({ command: '', identifier: '', date_from: '', date_to: '', username: '' });
          setTimeout(fetchRecords, 0);
        }} style={btnStyle('#888')}>Сбросить</button>
      </div>

      {/* Results count */}
      <p style={{ color: '#888', fontSize: 14, marginBottom: 12 }}>
        Найдено записей: {records.length}
      </p>

      {records.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', color: '#888', padding: 40 }}>
          Записей не найдено. Попробуйте изменить параметры фильтрации.
        </div>
      )}

      {/* Records list */}
      {records.map((r) => (
        <div key={r.id} style={{
          ...cardStyle,
          borderLeft: r.is_confirmed ? '4px solid #388e3c' : '4px solid #f57c00',
        }}>
          {/* Header row — clickable to expand */}
          <div
            onClick={() => toggleExpand(r.id)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer', marginBottom: expanded === r.id ? 16 : 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 700, color: '#1a1a1a' }}>#{r.id}</span>
              {r.command && commandLabel(r.command)}
              {r.identifier && (
                <span style={{
                  fontFamily: 'monospace', fontWeight: 600, fontSize: 14,
                  background: '#f5f5f5', padding: '3px 8px', borderRadius: 4,
                }}>
                  {r.identifier}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {r.is_confirmed ? (
                <span style={{ color: '#388e3c', fontSize: 12, fontWeight: 600 }}>Подтверждено</span>
              ) : (
                <span style={{ color: '#f57c00', fontSize: 12, fontWeight: 600 }}>Не подтверждено</span>
              )}
              <span style={{ color: '#999', fontSize: 12 }}>
                {r.username} | {new Date(r.created_at).toLocaleString('ru-RU')}
              </span>
              <span style={{ color: '#aaa', fontSize: 18 }}>
                {expanded === r.id ? '\u25B2' : '\u25BC'}
              </span>
            </div>
          </div>

          {/* Expanded details */}
          {expanded === r.id && (
            <div>
              {/* Audio player */}
              {audioUrls[r.id] && (
                <div style={{
                  marginBottom: 14, padding: 10, background: '#f5f5f5',
                  borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#444' }}>Аудио:</span>
                  <audio controls src={audioUrls[r.id]} style={{ flex: 1, height: 36 }} />
                  <span style={{ fontSize: 12, color: '#888' }}>{r.duration_seconds} сек.</span>
                </div>
              )}

              {editing === r.id ? (
                /* Edit mode */
                <div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Распознанный текст (корректировка)</label>
                    <input style={{ ...inputStyle, width: '100%' }} value={editData.corrected_text}
                      onChange={(e) => setEditData({ ...editData, corrected_text: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Команда</label>
                      <select style={{ ...inputStyle, width: '100%' }} value={editData.command}
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
                      <label style={labelStyle}>Идентификатор</label>
                      <input style={{ ...inputStyle, width: '100%' }} value={editData.identifier}
                        placeholder="Например: Р45345ИВ"
                        onChange={(e) => setEditData({ ...editData, identifier: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => saveEdit(r.id)} style={btnStyle('#388e3c')}>Сохранить</button>
                    <button onClick={() => setEditing(null)} style={btnStyle('#888')}>Отмена</button>
                  </div>
                </div>
              ) : (
                /* Detail view */
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 14 }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px 10px', fontWeight: 600, width: 180, color: '#444' }}>
                          Распознанный текст:
                        </td>
                        <td style={{ padding: '6px 10px' }}>{r.raw_text}</td>
                      </tr>
                      {r.corrected_text && (
                        <tr style={{ background: '#fffde7' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 600, color: '#444' }}>
                            Скорректированный:
                          </td>
                          <td style={{ padding: '6px 10px' }}>{r.corrected_text}</td>
                        </tr>
                      )}
                      <tr style={{ background: '#f9f9f9' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#444' }}>Команда:</td>
                        <td style={{ padding: '6px 10px' }}>
                          {r.command ? commandLabel(r.command) : <span style={{ color: '#999' }}>—</span>}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#444' }}>Идентификатор:</td>
                        <td style={{ padding: '6px 10px' }}>
                          {r.identifier ? (
                            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.identifier}</span>
                          ) : <span style={{ color: '#999' }}>—</span>}
                        </td>
                      </tr>
                      <tr style={{ background: '#f9f9f9' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#444' }}>Оператор:</td>
                        <td style={{ padding: '6px 10px' }}>{r.username}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#444' }}>Время записи:</td>
                        <td style={{ padding: '6px 10px' }}>
                          {new Date(r.created_at).toLocaleString('ru-RU')}
                        </td>
                      </tr>
                      <tr style={{ background: '#f9f9f9' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#444' }}>Длительность:</td>
                        <td style={{ padding: '6px 10px' }}>{r.duration_seconds} сек.</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#444' }}>Статус:</td>
                        <td style={{ padding: '6px 10px' }}>
                          {r.is_confirmed ? (
                            <span style={{ color: '#388e3c', fontWeight: 600 }}>Подтверждено</span>
                          ) : (
                            <span style={{ color: '#f57c00', fontWeight: 600 }}>Ожидает подтверждения</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => startEdit(r)} style={btnStyle('#f57c00')}>
                      Скорректировать
                    </button>
                    {!r.is_confirmed && (
                      <button onClick={() => confirmRecord(r.id)} style={btnStyle('#388e3c')}>
                        Подтвердить
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
