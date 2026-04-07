import { supabase } from "../supabaseClient";
import axios from 'axios';

const BACKEND_URL = 'http://localhost:3001'; // Update this to your production URL later

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
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(username, name, avatar_url)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Feed fetch failed:', err);
    return [];
  }
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

  if (error) {
    console.error('Supabase createPost error:', error.message, error.details);
  }
  return { data, error };
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
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(username, name, avatar_url)')
    .eq('id', postId)
    .single();
  return data;
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
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setComments(data || []);
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
