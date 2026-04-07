require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_SERVICE_ROLE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. Feed Ranking API (/feed/:userId)
// ==========================================
app.get('/feed/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const type = req.query.type || 'foryou'; // 'foryou' | 'following'
    
    // Fetch base posts
    let query = supabase
      .from('posts')
      .select('*, profiles(username, name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (type === 'following') {
      // Get who the user follows
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);
        
      const followingIds = follows ? follows.map(f => f.following_id) : [];
      if (followingIds.length > 0) {
        query = query.in('user_id', followingIds);
      } else {
        // user follows no one, return empty
        return res.json([]);
      }
    }
    
    const { data: posts, error } = await query;
    if (error) throw error;

    // AI Logic Mock: Feed Ranking
    // We mix recency and popularity
    const rankedPosts = posts.map(post => {
      // Calculate a basic score:
      // +10 per like, +20 per comment
      // -1 for every hour old
      const hoursOld = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
      const score = (post.likes_count * 10) + (post.comments_count * 20) - (hoursOld * 5);
      return { ...post, ai_score: score };
    });

    if (type === 'foryou') {
      // Sort by AI score descending
      rankedPosts.sort((a, b) => b.ai_score - a.ai_score);
    }
    
    res.json(rankedPosts);
  } catch (error) {
    console.error("Feed Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. Recommendation Engine (/recommend/:userId)
// ==========================================
app.get('/recommend/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // 1. Get user's liked posts to determine interests
    const { data: likedPosts } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId);
    
    const likedIds = likedPosts ? likedPosts.map(l => l.post_id) : [];
    
    // 2. Get posts liked by people who liked the same posts
    // For simplicity of this mock: We just return trending posts user hasn't liked yet
    const { data: recommendations, error } = await supabase
      .from('posts')
      .select('*, profiles(username, name, avatar_url)')
      .order('likes_count', { ascending: false })
      .limit(10);
      
    if (error) throw error;
    
    const finalRecs = recommendations.filter(p => !likedIds.includes(p.id));
    res.json(finalRecs);

  } catch (error) {
    console.error("Recommendation Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);
});
