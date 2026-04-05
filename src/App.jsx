import { ErrorBoundary } from "./components/ErrorBoundary";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import Reader from './pages/Reader';
import Comments from './pages/Comments';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Conversations from './pages/Conversations';
import ChatThread from './pages/ChatThread';
import MyProfile from './pages/MyProfile';
import EditProfile from './pages/EditProfile';
import Saved from './pages/Saved';
import AddArticle from './pages/AddArticle';
import BlogPage from './pages/BlogPage';

import { useAuth } from "./context/AuthContext";

const LoadingScreen = () => {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(true), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)', // Use app theme color instead of literal black
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      zIndex: 9999
    }}>
      <div className="premium-loader">
        <div className="logo-mark" style={{ width: 60, height: 60, marginBottom: 20 }}></div>
      </div>
      <div style={{ 
        fontSize: '1.2rem', 
        fontWeight: 600, 
        letterSpacing: '0.1rem',
        marginBottom: 8,
        background: 'linear-gradient(90deg, #fff, #888, #fff)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s infinite linear'
      }}>INKWELL</div>
      <div style={{ fontSize: '0.8rem', opacity: 0.4, fontWeight: 400 }}>
        {showHint ? 'Taking longer than usual... Check your connection' : 'Connecting to your feed...'}
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return !user ? children : <Navigate to="/home" replace />;
};

function App() {
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2200);
  };

  return (
    <ErrorBoundary><Router>
      <div className="bg-layer"></div>
      <div className="floating-icons">
        <div className="fi">✍️</div><div className="fi">📖</div><div className="fi">🔖</div>
        <div className="fi">📰</div><div className="fi">✉️</div><div className="fi">💡</div>
        <div className="fi">🖊️</div><div className="fi">📚</div><div className="fi">🗞️</div><div className="fi">🏛️</div>
      </div>

      <div className="app">
        <div className="screen">
          <Routes>
            <Route path="/" element={<PublicRoute><Welcome /></PublicRoute>} />
            <Route path="/blog-test" element={<BlogPage />} />
            <Route path="/login" element={<PublicRoute><Login showToast={showToast} /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><Signup showToast={showToast} /></PublicRoute>} />

            {/* Protected Dashboard/Social Routes */}
            <Route path="/home" element={<ProtectedRoute><Home showToast={showToast} /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><Search showToast={showToast} /></ProtectedRoute>} />
            <Route path="/article/:id" element={<ProtectedRoute><Reader showToast={showToast} /></ProtectedRoute>} />
            <Route path="/comments/:id" element={<ProtectedRoute><Comments showToast={showToast} /></ProtectedRoute>} />
            <Route path="/profile/:username" element={<ProtectedRoute><Profile showToast={showToast} /></ProtectedRoute>} />
            <Route path="/profile" element={<Navigate to="/my-profile" replace />} />
            <Route path="/conversations" element={<ProtectedRoute><Conversations showToast={showToast} /></ProtectedRoute>} />
            <Route path="/chat/:id" element={<ProtectedRoute><ChatThread showToast={showToast} /></ProtectedRoute>} />
            <Route path="/my-profile" element={<ProtectedRoute><MyProfile showToast={showToast} /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute><EditProfile showToast={showToast} /></ProtectedRoute>} />
            <Route path="/edit-article/:id" element={<ProtectedRoute><AddArticle showToast={showToast} /></ProtectedRoute>} />
            <Route path="/saved" element={<ProtectedRoute><Saved showToast={showToast} /></ProtectedRoute>} />
            <Route path="/add-article" element={<ProtectedRoute><AddArticle showToast={showToast} /></ProtectedRoute>} />
          </Routes>
        </div>
      </div>

      <div className={`toast ${toastMsg ? 'show' : ''}`} id="toast-el">
        {toastMsg}
      </div>
    </Router></ErrorBoundary>
  );
}

export default App;
