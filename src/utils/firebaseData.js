import { db } from "../firebaseConfig";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  increment,
  setDoc
} from "firebase/firestore";

const MOCK_POSTS = [];

const MOCK_COMMENTS = [];

// ─── Real-time feed ─────────────────────────────────────────────────────────

export const subscribeToPosts = (setPosts) => {
  // REMOVE strictly ordered query because null serverTimestamps are omitted from results
  const q = query(collection(db, 'posts'));
  
  return onSnapshot(q, async (snapshot) => {
    const posts = await Promise.all(snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      let profile = data.profiles;
      if (!profile && data.user_id) {
        const pDoc = await getDoc(doc(db, 'profiles', data.user_id));
        profile = pDoc.exists() ? pDoc.data() : null;
      }
      
      return { 
        id: docSnap.id, 
        ...data, 
        profiles: profile,
        // Robust timestamp handling: fallback to current time if serverTimestamp is still null
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
      };
    }));

    // Perform JS-side sort so we catch new posts IMMEDIATELY
    const sortedPosts = posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setPosts(sortedPosts);
  });
};

// ─── AI Feed (Merged with Mocks) ────────────────────────────────────────────

export const getAIFeed = async (userId, type = 'foryou') => {
  try {
    const q = query(collection(db, 'posts'), orderBy('created_at', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    
    const realPosts = await Promise.all(snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      let profile = data.profiles;
      if (!profile && data.user_id) {
        const pDoc = await getDoc(doc(db, 'profiles', data.user_id));
        profile = pDoc.exists() ? pDoc.data() : null;
      }
      return { 
        id: docSnap.id, 
        ...data, 
        profiles: profile,
        created_at: data.created_at?.toDate()?.toISOString() || new Date().toISOString()
      };
    }));

    if (realPosts.length > 0) {
      const sortedReal = realPosts.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      return sortedReal;
    }
    return [];
  } catch (e) {
    console.error("Firebase getAIFeed error:", e);
    return MOCK_POSTS;
  }
};

// ─── Profiles ───────────────────────────────────────────────────────────────

export const getUserProfile = async (uid) => {
  const profileSnap = await getDoc(doc(db, 'profiles', uid));
  return profileSnap.exists() ? profileSnap.data() : null;
};

export const updateProfile = async (uid, updates) => {
  try {
    await setDoc(doc(db, 'profiles', uid), updates, { merge: true });
    return { error: null };
  } catch (error) {
    return { error };
  }
};

// ─── Posts ──────────────────────────────────────────────────────────────────

export const createPost = async (post, userId) => {
  if (!userId) return { data: null, error: new Error('User not logged in') };

  try {
    const profile = await getUserProfile(userId);
    const postData = {
      user_id: userId,
      title: post.title,
      content: post.content,
      image_url: post.image_url || null,
      created_at: serverTimestamp(),
      likes_count: 0,
      comments_count: 0,
      profiles: profile // Denormalize for faster reads
    };

    const docRef = await addDoc(collection(db, 'posts'), postData);
    return { data: { id: docRef.id, ...postData }, error: null };
  } catch (error) {
    console.error("createPost error:", error);
    return { data: null, error };
  }
};

export const updatePost = async (postId, updates) => {
  try {
    await updateDoc(doc(db, 'posts', postId), updates);
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const getPostsByAuthor = async (authorId) => {
  const q = query(collection(db, 'posts'), where('user_id', '==', authorId), orderBy('created_at', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ 
    id: d.id, 
    ...d.data(), 
    created_at: d.data().created_at?.toDate()?.toISOString() 
  }));
};

export const getPost = async (postId) => {
  // Check mocks first if it starts with mock-
  if (postId && typeof postId === 'string' && postId.startsWith('mock-')) {
    const mock = MOCK_POSTS.find(p => p.id === postId);
    if (mock) return mock;
  }

  try {
    const docSnap = await getDoc(doc(db, 'posts', postId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return { 
        id: docSnap.id, 
        ...data, 
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString()) 
      };
    }
  } catch (e) {
    console.error("getPost error:", e);
  }
  return MOCK_POSTS[0]; // Final fallback
};

// ─── Likes ──────────────────────────────────────────────────────────────────

export const toggleLike = async (postId, userId) => {
  try {
    // STRICT ACTION: Ensure the post exists so updateDoc doesn't fail
    await ensurePostExists(postId);

    const likeRef = doc(db, 'likes', `${userId}_${postId}`);
    const likeSnap = await getDoc(likeRef);

    if (likeSnap.exists()) {
      await deleteDoc(likeRef);
      await updateDoc(doc(db, 'posts', postId), { likes_count: increment(-1) });
      return { liked: false, error: null };
    } else {
      await setDoc(likeRef, { post_id: postId, user_id: userId, created_at: serverTimestamp() });
      await updateDoc(doc(db, 'posts', postId), { likes_count: increment(1) });
      return { liked: true, error: null };
    }
  } catch (error) {
    return { error };
  }
};

export const subscribeToLikes = (postId, setLiked, setCount, userId) => {
  // Watch post for likes_count
  const postUnsub = onSnapshot(doc(db, 'posts', postId), (docSnap) => {
    if (docSnap.exists()) setCount(docSnap.data().likes_count || 0);
  });

  // Watch individual user's like status
  let likeUnsub = () => {};
  if (userId) {
    const likeRef = doc(db, 'likes', `${userId}_${postId}`);
    likeUnsub = onSnapshot(likeRef, (docSnap) => {
      setLiked(docSnap.exists());
    });
  }

  return () => {
    postUnsub();
    likeUnsub();
  };
};

// ─── Comments ───────────────────────────────────────────────────────────────

// Helper to make mock posts "real" in the database upon first interaction
const ensurePostExists = async (postId) => {
  const postRef = doc(db, 'posts', postId);
  const snap = await getDoc(postRef);
  
  if (!snap.exists()) {
    // Check if it's one of our mock posts
    const mock = MOCK_POSTS.find(p => p.id === postId);
    if (mock) {
      await setDoc(postRef, {
        ...mock,
        likes_count: mock.likes_count || 0,
        comments_count: mock.comments_count || 0,
        created_at: new Date().toISOString()
      }, { merge: true });
    } else {
      // Create a skeletal record if it's not a mock but someone is interacting with it
      await setDoc(postRef, {
        id: postId,
        title: 'Untitled Post',
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString()
      }, { merge: true });
    }
  }
};

export const addComment = async (postId, userId, content) => {
  try {
    // STRICT ACTION: Ensure the post exists so updateDoc doesn't fail
    await ensurePostExists(postId);

    const profile = await getUserProfile(userId);
    await addDoc(collection(db, 'comments'), {
      post_id: postId,
      user_id: userId,
      content,
      created_at: serverTimestamp(),
      profiles: profile
    });
    await updateDoc(doc(db, 'posts', postId), { comments_count: increment(1) });
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const deleteComment = async (commentId) => {
  try {
    const commentRef = doc(db, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    if (commentSnap.exists()) {
      const postId = commentSnap.data().post_id;
      await deleteDoc(commentRef);
      await updateDoc(doc(db, 'posts', postId), { comments_count: increment(-1) });
    }
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const subscribeToComments = (postId, setComments) => {
  // REMOVE strictly ordered query because null serverTimestamps are omitted from results
  const q = query(collection(db, 'comments'), where('post_id', '==', postId));
  
  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      created_at: d.data().created_at?.toDate ? d.data().created_at.toDate().toISOString() : (d.data().created_at || new Date().toISOString())
    }));
    
    // Manual sort to ensure instant visibility of new comments
    const sorted = comments.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    setComments(sorted);
  });
};

// ─── Saved Posts ──────────────────────────────────────────────────────────

export const toggleSavePost = async (postId, userId) => {
  const saveRef = doc(db, 'saved_posts', `${userId}_${postId}`);
  const saveSnap = await getDoc(saveRef);

  if (saveSnap.exists()) {
    await deleteDoc(saveRef);
    return { saved: false, error: null };
  } else {
    await setDoc(saveRef, { post_id: postId, user_id: userId, created_at: serverTimestamp() });
    return { saved: true, error: null };
  }
};

export const isPostSaved = async (postId, userId) => {
  if (!userId) return false;
  const saveSnap = await getDoc(doc(db, 'saved_posts', `${userId}_${postId}`));
  return saveSnap.exists();
};

export const subscribeToSavedPosts = (userId, setSavedPosts) => {
  if (!userId) {
    setSavedPosts([]);
    return () => {};
  }

  // Remove orderBy to avoid composite index requirement
  const q = query(collection(db, 'saved_posts'), where('user_id', '==', userId));
  
  return onSnapshot(q, async (snapshot) => {
    try {
      const saved = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const postId = docSnap.data().post_id;
        const post = await getPost(postId);
        // Extract created_at for sorting
        const rawTime = docSnap.data().created_at;
        const savedAt = rawTime?.toDate ? rawTime.toDate() : (rawTime ? new Date(rawTime) : new Date());
        return post ? { ...post, saved_at: savedAt } : null;
      }));
      
      const filtered = saved.filter(Boolean);
      // Sort in JS
      const sorted = filtered.sort((a,b) => b.saved_at - a.saved_at);
      setSavedPosts(sorted);
    } catch (e) {
      console.error("subscribeToSavedPosts error:", e);
      setSavedPosts([]);
    }
  });
};

// ─── Profile Extensions ──────────────────────────────────────────────────────

export const getLikedPosts = async (userId) => {
  try {
    const q = query(collection(db, 'likes'), where('user_id', '==', userId), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    const posts = await Promise.all(snapshot.docs.map(async (docSnap) => {
      return await getPost(docSnap.data().post_id);
    }));
    return posts.filter(Boolean);
  } catch (e) {
    console.error("getLikedPosts error:", e);
    return [];
  }
};

export const getUserActivity = async (userId) => {
  try {
    const q = query(collection(db, 'comments'), where('user_id', '==', userId), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
      ...d.data(),
      id: d.id,
      created_at: d.data().created_at?.toDate()?.toISOString()
    }));
  } catch (e) {
    console.error("getUserActivity error:", e);
    return [];
  }
};

export const getFollowStats = async (userId) => {
  try {
    const followersQ = query(collection(db, 'follows'), where('following_id', '==', userId));
    const followingQ = query(collection(db, 'follows'), where('follower_id', '==', userId));
    
    const [followersSnap, followingSnap] = await Promise.all([
      getDocs(followersQ),
      getDocs(followingQ)
    ]);
    
    return {
      followers: followersSnap.size,
      following: followingSnap.size
    };
  } catch (e) {
    console.error("getFollowStats error:", e);
    return { followers: 0, following: 0 };
  }
};

export const subscribeToFollowStats = (userId, callback) => {
  if (!userId) return () => {};

  const followersQ = query(collection(db, 'follows'), where('following_id', '==', userId));
  const followingQ = query(collection(db, 'follows'), where('follower_id', '==', userId));

  let stats = { followers: 0, following: 0 };

  const unsubFollowers = onSnapshot(followersQ, (snap) => {
    stats.followers = snap.size;
    callback({ ...stats });
  });

  const unsubFollowing = onSnapshot(followingQ, (snap) => {
    stats.following = snap.size;
    callback({ ...stats });
  });

  return () => {
    unsubFollowers();
    unsubFollowing();
  };
};

// ─── Follow Logic ────────────────────────────────────────────────────────────

export const isFollowing = async (followerId, followingId) => {
  if (!followerId || !followingId) return false;
  const followRef = doc(db, 'follows', `${followerId}_${followingId}`);
  const followSnap = await getDoc(followRef);
  return followSnap.exists();
};

export const followUser = async (followerId, followingId) => {
  try {
    const followRef = doc(db, 'follows', `${followerId}_${followingId}`);
    await setDoc(followRef, {
      follower_id: followerId,
      following_id: followingId,
      created_at: serverTimestamp()
    });
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const unfollowUser = async (followerId, followingId) => {
  try {
    const followRef = doc(db, 'follows', `${followerId}_${followingId}`);
    await deleteDoc(followRef);
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const getFollowingList = async (userId) => {
  try {
    const q = query(collection(db, 'follows'), where('follower_id', '==', userId));
    const snapshot = await getDocs(q);
    
    const following = await Promise.all(snapshot.docs.map(async (docSnap) => {
      const targetId = docSnap.data().following_id;
      const profile = await getUserProfile(targetId);
      // Fallback for mock/editorial accounts that don't have a profile document yet
      return profile ? { ...profile, id: targetId } : { id: targetId, name: 'Sample Account', username: targetId, is_placeholder: true };
    }));
    
    return following.filter(Boolean);
  } catch (e) {
    console.error("getFollowingList error:", e);
    return [];
  }
};

// ─── Messaging Logic ─────────────────────────────────────────────────────────

export const subscribeToConversations = (userId, callback) => {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId)
  );

  return onSnapshot(q, async (snapshot) => {
    const convs = await Promise.all(snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const otherId = data.participants.find(p => p !== userId);
      const otherProfile = await getUserProfile(otherId);
      
      return {
        id: docSnap.id,
        lastMessage: data.last_message,
        lastMessageAt: data.last_message_at?.toDate ? data.last_message_at.toDate().toISOString() : (data.last_message_at || new Date().toISOString()),
        lastSenderId: data.last_sender_id,
        otherParticipant: {
          id: otherId,
          name: otherProfile?.name || 'User',
          username: otherProfile?.username || 'user',
          avatar_url: otherProfile?.avatar_url
        }
      };
    }));
    
    // Sort in JS to handle pending last_message_at
    const sorted = convs.sort((a,b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    callback(sorted);
  });
};

export const getOrCreateConversation = async (uid1, uid2) => {
  try {
    const participants = [uid1, uid2].sort();
    const q = query(
      collection(db, 'conversations'),
      where('participants', '==', participants)
    );
    const snap = await getDocs(q);
    
    if (!snap.empty) return snap.docs[0].id;
    
    // Create new
    const newConv = await addDoc(collection(db, 'conversations'), {
      participants,
      last_message: 'Started a new conversation',
      last_message_at: serverTimestamp(),
      last_sender_id: uid1
    });
    return newConv.id;
  } catch (e) {
    console.error("getOrCreateConversation error:", e);
    return null;
  }
};

export const subscribeToMessages = (conversationId, callback) => {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages')
  );

  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      created_at: d.data().created_at?.toDate ? d.data().created_at.toDate().toISOString() : (d.data().created_at || new Date().toISOString())
    }));
    
    // Manual sort for real-time chat sync
    const sorted = msgs.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    callback(sorted);
  });
};

export const sendMessage = async (conversationId, senderId, content) => {
  try {
    const msgData = {
      sender_id: senderId,
      content,
      created_at: serverTimestamp()
    };
    
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), msgData);
    
    // Update conversation summary
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      last_message: content,
      last_message_at: serverTimestamp(),
      last_sender_id: senderId
    });
    
    return { error: null };
  } catch (error) {
    return { error };
  }
};
