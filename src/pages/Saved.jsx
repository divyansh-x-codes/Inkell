import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import ArticleCard from '../components/ArticleCard';
import { useAuth } from '../context/AuthContext';
import { subscribeToSavedBlogs } from '../utils/firebaseData';

export default function Saved({ showToast }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [savedArticles, setSavedArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time synchronization of the reading list from Firestore
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToSavedBlogs(user.uid, (blogs) => {
      setSavedArticles(blogs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="view active saved-page">
      <div className="app-shell" style={{ position: 'relative', background: '#0d0d0d' }}>
        
        {/* Header */}
        <div className="saved-header" style={{ padding: '24px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', fontFamily: "'Playfair Display', serif" }}>Reading List</h1>
          <button className="tb-circle-btn" onClick={() => showToast('List options')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="1.5"></circle>
              <circle cx="19" cy="12" r="1.5"></circle>
              <circle cx="5" cy="12" r="1.5"></circle>
            </svg>
          </button>
        </div>

        <div className="saved-scroll-area" style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {!user ? (
            <div style={{ padding: '60px 40px', textAlign: 'center', color: '#555' }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔐</div>
              <h2 style={{ color: 'white', marginBottom: '12px' }}>Sign in to save</h2>
              <p style={{ marginBottom: '24px' }}>Keep track of the stories you love across all your devices.</p>
              <button 
                onClick={() => navigate('/login')}
                style={{ background: 'var(--orange)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Sign In
              </button>
            </div>
          ) : loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#555' }}>Loading your list...</div>
          ) : savedArticles.length === 0 ? (
            <div style={{ padding: '80px 40px', textAlign: 'center', color: '#555' }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔖</div>
              <h2 style={{ color: 'white', marginBottom: '12px' }}>Your list is empty</h2>
              <p style={{ marginBottom: '32px' }}>Save stories to read them later. Your list will be synced to your account.</p>
              <button 
                onClick={() => navigate('/search')}
                style={{ background: '#1a1a1a', color: 'white', border: '1px solid #333', padding: '12px 24px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Explore articles
              </button>
            </div>
          ) : (
            <div style={{ padding: '0 16px' }}>
              {savedArticles.map(article => (
                <ArticleCard key={article.id} article={article} showToast={showToast} />
              ))}
            </div>
          )}
        </div>

        <BottomNav showToast={showToast} />
      </div>
    </div>
  );
}
