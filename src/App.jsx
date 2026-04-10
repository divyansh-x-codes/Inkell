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
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

import PremiumLoader from "./components/PremiumLoader";

const LoadingScreen = () => {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(true), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000000', 
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      position: 'fixed',
      inset: 0,
      zIndex: 9999
    }}>
      <div style={{ marginBottom: 32 }}>
        <PremiumLoader size={64} color="var(--orange)" thickness={4} />
      </div>
      
      <div style={{ 
        fontSize: '1.4rem', 
        fontWeight: 800, 
        letterSpacing: '0.15rem',
        marginBottom: 12,
        textTransform: 'uppercase',
        background: 'linear-gradient(90deg, #fff 0%, #444 50%, #fff 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundSize: '200% 100%',
        animation: 'shimmer 3s infinite ease-in-out'
      }}>Inktrix</div>
      
      <div style={{ 
        fontSize: '0.85rem', 
        opacity: 0.5, 
        fontWeight: 500,
        letterSpacing: '0.02em',
        transition: 'opacity 0.5s ease'
      }}>
        {showHint ? 'Taking longer than usual... Check your connection' : 'Connecting to your feed...'}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}} />
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  
  // Strict check: No user means redirect to home (Welcome)
  if (!user) return <Navigate to="/" replace />;
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  
  // If already logged in, skip Login/Signup/Welcome
  if (user) return <Navigate to="/home" replace />;
  
  return children;
};

function App() {
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2200);
  };

  return (
    <ErrorBoundary><Router>
      <ScrollToTop />
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
