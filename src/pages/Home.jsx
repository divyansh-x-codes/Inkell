import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import ArticleCard from '../components/ArticleCard';
import { useAuth } from '../context/AuthContext';
import { getAIFeed } from '../utils/supabaseData';
import { supabase } from '../supabaseClient';

const getInitials = (name) => {
  if (!name) return 'U';
  const s = name.trim().split(' ');
  return s.length > 1 ? (s[0][0] + (s[1][0] || '')).toUpperCase() : name[0].toUpperCase();
};

const avatarColors = ['#cc4400','#2b9348','#7046a0','#1a6fa8','#c0392b','#16a085'];
const colorForName = (name) => avatarColors[(name||'A').charCodeAt(0) % avatarColors.length];

function FollowingBar({ userId, navigate }) {
  const [followedUsers, setFollowedUsers] = useState([]);

  useEffect(() => {
    if (!userId) return;
    
    const fetchFollowed = async () => {
      const { data } = await supabase
        .from('follows')
        .select('following_id, profiles!following_id(*)')
        .eq('follower_id', userId);
      
      if (data) {
        setFollowedUsers(data.map(f => f.profiles));
      }
    };

    fetchFollowed();

    // Subtle realtime: if someone follows/unfollows, refresh
    const channel = supabase
      .channel(`followed_users_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `follower_id=eq.${userId}` }, fetchFollowed)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  const [brokenImages, setBrokenImages] = useState({});
  const handleImageError = (uid) => setBrokenImages(prev => ({ ...prev, [uid]: true }));

  if (!userId) return null;

  return (
    <div className="following-bar">
      <div className="stories-scroll">
        <div className="story-item add-more" onClick={() => navigate('/search')}>
          <div className="story-avatar plus-btn">
            <img src="/icons8-plus-96.png" alt="add" style={{ width: 32, height: 32, opacity: 0.8 }} />
          </div>
          <div className="story-name">Add more</div>
        </div>

        {followedUsers.map((u) => (
          <div key={u.id} className="story-item" onClick={() => navigate(`/profile/${encodeURIComponent(u.username || u.name)}`, { state: { authorId: u.id } })}>
            <div className="story-avatar">
              {(u.avatar_url) && !brokenImages[u.id] ? (
                <img src={u.avatar_url} alt={u.name} onError={() => handleImageError(u.id)} />
              ) : (
                <div className="story-initials" style={{ background: colorForName(u.name || 'U') }}>{getInitials(u.name || 'U')}</div>
              )}
            </div>
            <div className="story-name">{u.name?.split(' ')[0]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Module-level cache to prevent flicker when navigating back to Home
let cachedArticles = [];

export default function Home({ showToast }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [articles, setArticles] = useState(cachedArticles);
  const [loading, setLoading] = useState(cachedArticles.length === 0);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [feedType, setFeedType] = useState('foryou');

  const displayName = user?.profiles?.name || user?.name || 'User';
  const displayAvatar = user?.profiles?.avatar_url || user?.avatar_url || null;

  useEffect(() => {
    const loadFeed = async () => {
      // Only show full-screen spinner on the VERY FIRST load (empty state)
      // For every other case (re-mount, re-focus), keep existing articles visible
      const isFirstLoad = articles.length === 0;
      if (isFirstLoad) setLoading(true);

      const data = await getAIFeed(user?.id || 'anon', feedType);
      cachedArticles = data; // Save to global cache
      setArticles(data);
      setLoading(false);
    };

    loadFeed();

    // Real-time: instantly prepend new posts WITHOUT re-fetching the whole feed
    const channel = supabase
      .channel('home-feed-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          if (!payload.new?.id) return;
          // Fetch full post with profile data then prepend to top
          const { data: newPost } = await supabase
            .from('posts')
            .select('*, profiles(username, name, avatar_url)')
            .eq('id', payload.new.id)
            .single();
          if (newPost) {
            setArticles(prev => {
              if (prev.find(a => a.id === newPost.id)) return prev;
              const newFeed = [newPost, ...prev];
              cachedArticles = newFeed; // Update cache
              return newFeed;
            });
          }
        }
      )
      .subscribe();
    // Listen to local post creation (fixes optimistic rendering for large posts that might drop in realtime)
    const handleLocalPost = (e) => {
      const newPost = e.detail;
      if (newPost) {
        setArticles(prev => {
          if (prev.find(a => a.id === newPost.id)) return prev;
          const newFeed = [newPost, ...prev];
          cachedArticles = newFeed; // Update cache
          return newFeed;
        });
      }
    };
    window.addEventListener('local_post_created', handleLocalPost);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('local_post_created', handleLocalPost);
    };
  }, [user?.id, feedType]);

  // Scroll logic for Topbar visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        if (isVisible) setIsVisible(false);
      } else {
        if (!isVisible) setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isVisible]);

  return (
    <div id="v-home" className="view active">
      <div className="app-shell">
        <div className={`chronicle-topbar premium ${!isVisible ? 'hidden' : ''}`}>
          <div className="topbar-left">
            <div className="brand-logo" onClick={() => navigate('/')}>
              <img src="/logo.png" alt="logo" style={{ width: 40, height: 40, borderRadius: 8 }} />
              <span style={{ fontWeight: 800, fontSize: '1.2rem', marginLeft: 8 }}>Inktrix</span>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="tb-avatar" onClick={() => navigate('/my-profile')}>
              {displayAvatar ? <img src={displayAvatar} alt="av" /> : <div className="sc-initials" style={{ background: '#cc4400' }}>{getInitials(displayName)}</div>}
            </div>
          </div>
        </div>

        <div className="feed" id="main-feed" style={{ paddingTop: '20px', paddingBottom: '100px' }}>
          <FollowingBar userId={user?.id} navigate={navigate} />

          <div className="article-list-container">
            {loading ? (
              <div className="feed-status">Loading personalized feed...</div>
            ) : articles.length === 0 ? (
              <div className="feed-status empty">
                <h3>No articles yet</h3>
                <p>Start exploring to find your favorite writers.</p>
              </div>
            ) : (
              articles.map((article) => (
                <ArticleCard key={article.id} article={article} showToast={showToast} />
              ))
            )}
          </div>
        </div>

        <BottomNav showToast={showToast} currentPath="/home" />
      </div>
    </div>
  );
}

