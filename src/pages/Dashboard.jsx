import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';

function Dashboard({ user }) {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecordings();
  }, [user]);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'recordings'),
        where('uid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecordings(data);
    } catch (err) {
      console.error(err);
      // Ensure index is created if getting an index required error from Firebase
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('確定要刪除這筆紀錄嗎？')) {
      try {
        await deleteDoc(doc(db, 'recordings', id));
        setRecordings(prev => prev.filter(r => r.id !== id));
      } catch (err) {
        console.error(err);
        alert('刪除失敗');
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp.toDate()).toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div style={{marginTop: '2rem'}}>
      <h2>歷史語音紀錄</h2>
      <p style={{marginBottom: '2rem'}}>您過去的所有語音轉文字紀錄都在這裡。</p>
      
      {loading ? (
        <div className="status-text">載入中...</div>
      ) : recordings.length === 0 ? (
        <div className="glass-panel" style={{padding: '2rem', textAlign: 'center'}}>
          <p style={{marginBottom: '1rem'}}>尚無任何紀錄，去錄製一段吧！</p>
        </div>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          {recordings.map((rec) => (
            <div key={rec.id} className="glass-panel record-card">
              <div className="record-header">
                <span>📅 {formatDate(rec.createdAt)}</span>
                <button 
                  className="btn btn-danger" 
                  style={{padding: '0.4rem 0.8rem', fontSize: '0.85rem'}}
                  onClick={() => handleDelete(rec.id)}
                >
                  刪除
                </button>
              </div>
              <div className="record-text">
                {rec.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
