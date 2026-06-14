import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import './styles/main.css';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Recorder from './pages/Recorder';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) return <div className="login-container"><div className="status-text">Loading...</div></div>;

  return (
    <Router>
      {user && (
        <nav className="navbar">
          <Link to="/" className="navbar-brand">SpeakSlow Web</Link>
          <div className="navbar-links">
            <span style={{color: 'var(--text-muted)'}}>{user.displayName}</span>
            <Link to="/record" className="btn btn-primary">錄音</Link>
            <Link to="/dashboard" className="btn">歷史紀錄</Link>
            <button onClick={handleLogout} className="btn">登出</button>
          </div>
        </nav>
      )}
      
      <div className="container">
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/record" />} />
          <Route path="/record" element={user ? <Recorder user={user} /> : <Navigate to="/login" />} />
          <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to={user ? "/record" : "/login"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
