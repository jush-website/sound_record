import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      setError('登入失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="glass-panel login-card">
        <div className="login-icon">🎙️</div>
        <h2>聲聲慢 (SpeakSlow)</h2>
        <p style={{marginBottom: '2rem'}}>專為中文打造的語音辨識紀錄系統</p>
        
        {error && <div style={{color: 'var(--danger)', marginBottom: '1rem'}}>{error}</div>}
        
        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          className="btn btn-primary"
          style={{width: '100%', fontSize: '1.1rem'}}
        >
          {loading ? '登入中...' : '使用 Google 帳號登入'}
        </button>
      </div>
    </div>
  );
}

export default Login;
