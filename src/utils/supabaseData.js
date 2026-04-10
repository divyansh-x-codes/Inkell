import { supabase } from "../supabaseClient";
import axios from 'axios';

const BACKEND_URL = 'http://localhost:3001'; // Update this to your production URL later

const MOCK_POSTS = [
  {
    id: 'mock-1',
    title: "The Architecture of Inktrix",
    tagline: "Exploring the modern tech stack behind this premium publicación.",
    content: "Inktrix is built on the philosophy of speed and beauty. By leveraging Vite for instantaneous reloads and React Native Web for cross-platform visual excellence, we have created an interface that feels alive...",
    category: "Technology",
    image_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
    profiles: { name: 'Inktrix Editorial', avatar_url: 'https://images.unsplash.com/photo-1542435503-956c469947f6' },
    created_at: new Date().toISOString(),
    likes_count: 1420,
    comments_count: 85
  },
  {
    id: 'mock-2',
    title: "Design Systems in 2026",
    tagline: "Why glassmorphism and micro-interactions are here to stay.",
    content: "The aesthetic of the web has shifted from flat design to deep, layered interfaces. Transparency, blur, and vibrant gradients are no longer just trends; they are pillars of modern UX...",
    category: "Design",
    image_url: "https://images.unsplash.com/photo-1633356122544-f134324a6cee",
    profiles: { name: 'Sarah Chen', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330' },
    created_at: new Date(Date.now() - 86400000).toISOString(),
    likes_count: 2100,
    comments_count: 120
  },
  {
    id: 'mock-3',
    title: "Productivity for the Infinite Scroll Era",
    tagline: "How to focus when the world is constantly shouting for attention.",
    content: "In an era of notifications and instant gratification, the ability to focus on deep work is a superpower. We explore the tactics of top performers...",
    category: "Productivity",
    image_url: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e",
    profiles: { name: 'Alex Rivera', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d' },
    created_at: new Date(Date.now() - 172800000).toISOString(),
    likes_count: 890,
    comments_count: 42
  }
];

const MOCK_COMMENTS = [
  { id: 1, content: "This is a masterpiece. The glassmorphic design is truly peak 2026 aesthetic.", profiles: { name: "Julian Howard", avatar_url: "https://i.pravatar.cc/150?u=julian" }, created_at: new Date().toISOString() },
  { id: 2, content: "Finally, someone talking about Vite and React Native Web in one go. Pure gold.", profiles: { name: "Elena Rossi", avatar_url: "https://i.pravatar.cc/150?u=elena" }, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, content: "Can't wait to see more from Inktrix. The UI is absolutely stunning.", profiles: { name: "Marcus Wright", avatar_url: "https://i.pravatar.cc/150?u=marcus" }, created_at: new Date(Date.now() - 7200000).toISOString() }
];

// ─── Real-time feed ─────────────────────────────────────────────────────────

export const subscribeToPosts = (setPosts) => {
  const channel = supabase
    .channel('public:posts')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      () => {
        // Refetch or update local state
        fetchPosts().then(setPosts);
      }
    )
    .subscribe();

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(username, name, avatar_url)')
      .order('created_at', { ascending: false });
    return data || [];
  };

  fetchPosts().then(setPosts);
  return () => supabase.removeChannel(channel);
};

// ─── AI Feed ────────────────────────────────────────────────────────────────

export const getAIFeed = async (userId, type = 'foryou') => {
  const fetchRealPosts = async () => {
    try {
      const networkTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), 4000)
      );

      const fetchPromise = (async () => {
        let { data, error } = await supabase
          .from('posts')
          .select('*, profiles(username, name, avatar_url)')
          .order('created_at', { ascending: false });
        
        if (!data || data.length === 0) {
          const { data: altData } = await supabase
            .from('articles')
            .select('*, profiles:author_id(username, name, avatar_url)')
            .order('created_at', { ascending: false });
          
          if (altData && altData.length > 0) {
            data = altData.map(a => ({
              ...a,
              content: a.body || a.content,
              image_url: a.cover_image || a.image_url,
              tagline: a.tagline || (a.body ? a.body.substring(0, 100) + '...' : '')
            }));
          }
        }
        if (error && !data) throw error;
        return data || [];
      })();

      return await Promise.race([fetchPromise, networkTimeout]);
    } catch (e) {
      console.warn("Real fetch failed:", e.message);
      return [];
    }
  };

  const realPosts = await fetchRealPosts();
  
  // STRICT RULE: Real posts must ALWAYS be visible. 
  // We merge them with MOCK_POSTS to ensure a full, vibrant feed.
  const seenIds = new Set(realPosts.map(p => p.id));
  const uniqueMocks = MOCK_POSTS.filter(m => !seenIds.has(m.id));
  
  // Combine: Real posts first (sorted by date), then Mocks
  return [...realPosts, ...uniqueMocks];
};

// ─── Profiles ───────────────────────────────────────────────────────────────

export const getUserProfile = async (uid) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();
  return data;
};

export const updateProfile = async (uid, updates) => {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', uid);
  return { error };
};

// ─── Posts ──────────────────────────────────────────────────────────────────

export const createPost = async (post, userId) => {
  if (!userId) {
    console.error('createPost failed: userId is required');
    return { data: null, error: new Error('User not logged in') };
  }

  const fetchWithTimeout = async () => {
    try {
      const networkTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Publishing timed out. Please check your Supabase schema/connection.')), 5000)
      );

      const fetchPromise = (async () => {
        const { data, error } = await supabase
          .from('posts')
          .insert([{
            user_id: userId,
            title: post.title,
            tagline: post.tagline,
            content: post.content,
            image_url: post.image_url,
            category: post.category,
          }])
          .select('*, profiles(username, name, avatar_url)')
          .single();
        
        if (error) throw error;
        return data;
      })();

      return { data: await Promise.race([fetchPromise, networkTimeout]), error: null };
    } catch (e) {
      console.error('createPost error:', e.message);
      return { data: null, error: e };
    }
  };

  return await fetchWithTimeout();
};

export const updatePost = async (postId, updates) => {
  const { error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', postId);
  return { error };
};

export const getPostsByAuthor = async (authorId) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(username, name, avatar_url)')
    .eq('user_id', authorId)
    .order('created_at', { ascending: false });
  return data || [];
};

export const getPost = async (postId) => {
  const fetchWithTimeout = async () => {
    try {
      const networkTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Post timeout')), 4000));
      const fetchPromise = (async () => {
        const { data, error } = await supabase
          .from('posts')
          .select('*, profiles(username, name, avatar_url)')
          .eq('id', postId)
          .single();
        if (error && !data) throw error;
        return data;
      })();
      return await Promise.race([fetchPromise, networkTimeout]);
    } catch (e) {
      console.warn("getPost using fallback:", e.message);
      // Return a random mock if it's not found or times out
      return MOCK_POSTS[0];
    }
  };
  return await fetchWithTimeout();
};

// ─── Likes ──────────────────────────────────────────────────────────────────

export const toggleLike = async (postId, userId) => {
  // Check if liked
  const { data: existingLike } = await supabase
    .from('likes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (existingLike) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('id', existingLike.id);
    return { liked: false, error };
  } else {
    const { error } = await supabase
      .from('likes')
      .insert([{ post_id: postId, user_id: userId }]);
    return { liked: true, error };
  }
};

export const subscribeToLikes = (postId, setLiked, setCount) => {
  const channel = supabase
    .channel(`public:likes:post_id=eq.${postId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'likes', filter: `post_id=eq.${postId}` },
      () => {
        // Refetch count and individual state
        refresh();
      }
    )
    .subscribe();

  const refresh = async () => {
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    setCount(count || 0);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();
      setLiked(!!data);
    }
  };

  refresh();
  return () => supabase.removeChannel(channel);
};

// ─── Comments ───────────────────────────────────────────────────────────────

export const addComment = async (postId, userId, content) => {
  const { error } = await supabase
    .from('comments')
    .insert([{ post_id: postId, user_id: userId, content }]);
  return { error };
};

export const deleteComment = async (commentId) => {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);
  return { error };
};

export const subscribeToComments = (postId, setComments) => {
  const channel = supabase
    .channel(`public:comments:post_id=eq.${postId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
      () => {
        fetchComments();
      }
    )
    .subscribe();

  const fetchComments = async () => {
    try {
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(username, name, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      setComments((data && data.length > 0) ? data : MOCK_COMMENTS);
    } catch (e) {
      console.warn("fetchComments failed, using mocks:", e.message);
      setComments(MOCK_COMMENTS);
    }
  };

  fetchComments();
  return () => supabase.removeChannel(channel);
};

// ─── Follows ────────────────────────────────────────────────────────────────

export const followUser = async (followerId, followingId) => {
  const { error } = await supabase
    .from('follows')
    .insert([{ follower_id: followerId, following_id: followingId }]);
  return { error };
};

export const unfollowUser = async (followerId, followingId) => {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  return { error };
};

export const isFollowing = async (followerId, followingId) => {
  const { data } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .single();
  return !!data;
};

// ─── Notifications ──────────────────────────────────────────────────────────

export const subscribeToNotifications = (userId, setNotifications) => {
  const channel = supabase
    .channel(`public:notifications:user_id=eq.${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      () => {
        fetchNotifications();
      }
    )
    .subscribe();

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*, profiles!actor_id(username, name, avatar_url)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setNotifications(data || []);
  };

  fetchNotifications();
  return () => supabase.removeChannel(channel);
};

export const markNotificationRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  return { error };
};

// ─── Messaging ──────────────────────────────────────────────────────────────

export const getOrCreateConversation = async (user1Id, user2Id) => {
  // Check if conversation exists
  const { data: convos } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user1Id);

  const convoIds = convos?.map(c => c.conversation_id) || [];

  if (convoIds.length > 0) {
    const { data: existing } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .in('conversation_id', convoIds)
      .eq('user_id', user2Id)
      .maybeSingle();

    if (existing) return existing.conversation_id;
  }

  // Create new
  const { data: newConvo, error: cErr } = await supabase
    .from('conversations')
    .insert({})
    .select()
    .single();

  if (cErr) return null;

  await supabase
    .from('conversation_participants')
    .insert([
      { conversation_id: newConvo.id, user_id: user1Id },
      { conversation_id: newConvo.id, user_id: user2Id }
    ]);

  return newConvo.id;
};

export const fetchConversations = async (userId) => {
  const { data, error } = await supabase
    .from('conversation_participants')
    .select(`
      conversation_id,
      conversations (
        id,
        created_at,
        messages (
          content,
          created_at,
          sender_id
        )
      )
    `)
    .eq('user_id', userId);

  if (error) return [];

  // Manual join for other participants (Supabase doesn't support nested joins across many-to-many easily in one query)
  const result = await Promise.all(data.map(async (row) => {
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id, profiles(*)')
      .eq('conversation_id', row.conversation_id)
      .neq('user_id', userId);

    const otherParticipant = participants?.[0]?.profiles || { name: 'User', id: participants?.[0]?.user_id };

    // Sort messages to get the latest one
    const messages = row.conversations.messages || [];
    const lastMessage = messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    return {
      id: row.conversation_id,
      otherParticipant,
      lastMessage: lastMessage?.content || '',
      lastMessageAt: lastMessage?.created_at || row.conversations.created_at,
      lastSenderId: lastMessage?.sender_id
    };
  }));

  return result.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
};

export const subscribeToConversations = (userId, setConversations) => {
  const channel = supabase
    .channel(`public:conversations:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages' }, // Simplest way to watch for new messages
      () => {
        fetchConversations(userId).then(setConversations);
      }
    )
    .subscribe();

  fetchConversations(userId).then(setConversations);
  return () => supabase.removeChannel(channel);
};

export const subscribeToMessages = (conversationId, setMessages) => {
  const channel = supabase
    .channel(`public:messages:conversation_id=eq.${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      () => {
        fetchMessages();
      }
    )
    .subscribe();

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles!sender_id(username, name, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  fetchMessages();
  return () => supabase.removeChannel(channel);
};

export const sendMessage = async (conversationId, senderId, content) => {
  const { error } = await supabase
    .from('messages')
    .insert([{ conversation_id: conversationId, sender_id: senderId, content }]);
  return { error };
};

// ─── Profile Extensions ───────────────────────────────────────────────────

export const getLikedPosts = async (userId) => {
  const { data } = await supabase
    .from('likes')
    .select('*, posts(*, profiles(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data?.map(l => l.posts).filter(Boolean) || [];
};

export const getUserActivity = async (userId) => {
  const { data } = await supabase
    .from('comments')
    .select('*, posts(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
};

export const getFollowStats = async (userId) => {
  const { count: followers } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  const { count: following } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId);

  return { followers: followers || 0, following: following || 0 };
};
// ─── Saved Posts ──────────────────────────────────────────────────────────

export const toggleSavePost = async (postId, userId) => {
  const { data: existingSave } = await supabase
    .from('saved_posts')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingSave) {
    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .eq('id', existingSave.id);
    return { saved: false, error };
  } else {
    const { error } = await supabase
      .from('saved_posts')
      .insert([{ post_id: postId, user_id: userId }]);
    return { saved: true, error };
  }
};

export const isPostSaved = async (postId, userId) => {
  if (!userId) return false;
  const { data } = await supabase
    .from('saved_posts')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
};

export const subscribeToSavedPosts = (userId, setSavedPosts) => {
  if (!userId) {
    setSavedPosts([]);
    return () => { };
  }

  const channel = supabase
    .channel(`public:saved_posts:user_id=eq.${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'saved_posts', filter: `user_id=eq.${userId}` },
      () => {
        fetchSavedPosts();
      }
    )
    .subscribe();

  const fetchSavedPosts = async () => {
    const { data } = await supabase
      .from('saved_posts')
      .select('*, posts(*, profiles(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Transform to match the post structure expected by ArticleCard
    const blogs = data?.map(s => ({
      ...s.posts,
      author: s.posts?.profiles
    })).filter(b => b.id) || [];

    setSavedPosts(blogs);
  };

  fetchSavedPosts();
  return () => supabase.removeChannel(channel);
};
