import { useState, useEffect } from 'react';
import api from '../api';

export default function HistoryPage() {
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({ command: '', identifier: '', date_from: '', date_to: '', username: '' });
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({ corrected_text: '', command: '', identifier: '' });
  const role = localStorage.getItem('role');

  const fetchRecords = async () => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    const { data } = await api.get('/records', { params });
    setRecords(data);
  };

  useEffect(() => { fetchRecords(); }, []);

  const playAudio = (id) => {
    const token = localStorage.getItem('token');
    fetch(`/api/records/${id}/audio`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        new Audio(url).play();
      });
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
    padding: '8px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: 14,
  };

  const cardStyle = {
    background: '#fff', borderRadius: 12, padding: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 16,
  };

  return (
    <div>
      <h2>История записей</h2>

      <div style={{ ...cardStyle, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>Команда</label>
          <input style={inputStyle} value={filters.command}
            onChange={(e) => setFilters({ ...filters, command: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>Идентификатор</label>
          <input style={inputStyle} value={filters.identifier}
            onChange={(e) => setFilters({ ...filters, identifier: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>Дата от</label>
          <input style={inputStyle} type="date" value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>Дата до</label>
          <input style={inputStyle} type="date" value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
        </div>
        {role === 'admin' && (
          <div>
            <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>Оператор</label>
            <input style={inputStyle} value={filters.username}
              onChange={(e) => setFilters({ ...filters, username: e.target.value })} />
          </div>
        )}
        <button onClick={fetchRecords} style={{
          padding: '8px 20px', background: '#1976d2', color: '#fff',
          border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600, height: 38,
        }}>Найти</button>
      </div>

      {records.length === 0 && <p style={{ color: '#888' }}>Записей не найдено</p>}

      {records.map((r) => (
        <div key={r.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>#{r.id} — {r.username}</span>
            <span style={{ color: '#888', fontSize: 13 }}>
              {new Date(r.created_at).toLocaleString('ru-RU')} | {r.duration_seconds} сек.
              {r.is_confirmed && <span style={{ color: '#388e3c', marginLeft: 8 }}>Подтверждено</span>}
            </span>
          </div>

          {editing === r.id ? (
            <div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12 }}>Текст</label>
                <input style={{ ...inputStyle, width: '100%' }} value={editData.corrected_text}
                  onChange={(e) => setEditData({ ...editData, corrected_text: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12 }}>Команда</label>
                  <input style={{ ...inputStyle, width: '100%' }} value={editData.command}
                    onChange={(e) => setEditData({ ...editData, command: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12 }}>Идентификатор</label>
                  <input style={{ ...inputStyle, width: '100%' }} value={editData.identifier}
                    onChange={(e) => setEditData({ ...editData, identifier: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => saveEdit(r.id)} style={{
                  padding: '6px 16px', background: '#388e3c', color: '#fff',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                }}>Сохранить</button>
                <button onClick={() => setEditing(null)} style={{
                  padding: '6px 16px', background: '#888', color: '#fff',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                }}>Отмена</button>
              </div>
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: 4, fontWeight: 600, width: 160 }}>Текст:</td>
                    <td style={{ padding: 4 }}>{r.corrected_text || r.raw_text}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: 4, fontWeight: 600 }}>Команда:</td>
                    <td style={{ padding: 4 }}>{r.command || '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: 4, fontWeight: 600 }}>Идентификатор:</td>
                    <td style={{ padding: 4 }}>{r.identifier || '—'}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => playAudio(r.id)} style={{
                  padding: '6px 14px', background: '#1976d2', color: '#fff',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                }}>Прослушать</button>
                <button onClick={() => startEdit(r)} style={{
                  padding: '6px 14px', background: '#f57c00', color: '#fff',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                }}>Редактировать</button>
                {!r.is_confirmed && (
                  <button onClick={() => confirmRecord(r.id)} style={{
                    padding: '6px 14px', background: '#388e3c', color: '#fff',
                    border: 'none', borderRadius: 4, cursor: 'pointer',
                  }}>Подтвердить</button>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
