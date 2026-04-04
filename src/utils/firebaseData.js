import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  setDoc,
  getDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  updateDoc,
  collectionGroup,
} from "firebase/firestore";
import { articles as mockArticles } from "../data";

const BLOGS_COL = "blogs";
const FOLLOWS_COL = "follows";
const COMMENTS_COL = "comments";
const LIKES_COL = "likes";
const SAVES_COL = "saves";
const CONVOS_COL = "conversations";
const MESSAGES_COL = "messages";
const USERS_COL = "users";

// ─── Real-time feed (onSnapshot) ─────────────────────────────────────────────
export const subscribeToBlogs = (setBlogs) => {
  const q = query(collection(db, BLOGS_COL), orderBy("createdAt", "desc"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      setBlogs(mockArticles);
    } else {
      const blogs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setBlogs(blogs);
    }
  }, (err) => {
    console.warn("Real-time feed failed:", err.message);
    setBlogs([]);
  });
  return unsubscribe;
};

// ─── One-time fetches ─────────────────────────────────────────────────────────

// Fetch user profile by UID
export const getUserProfile = async (uid) => {
  if (!uid) return null;
  const snap = await getDoc(doc(db, USERS_COL, uid));
  if (snap.exists()) return { uid: snap.id, ...snap.data() };
  return null;
};

// Fetch real articles by particular author
export const getArticlesByAuthor = async (authorId) => {
  try {
    const q = query(collection(db, BLOGS_COL), where("authorId", "==", authorId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Fetch by author failed", err);
    return [];
  }
};

// ─── Publish a blog ───────────────────────────────────────────────────────────
export const createBlog = async (blog, user) => {
  try {
    const docRef = await addDoc(collection(db, BLOGS_COL), {
      title: blog.title,
      tagline: blog.tagline || "",
      content: blog.content,
      category: blog.category,
      coverImage: blog.coverImage || "",
      readTime: blog.readTime,
      authorId: user.uid,
      authorName: user.displayName || user.name || "Anonymous",
      authorEmail: user.email || "",
      createdAt: serverTimestamp(),
      likesCount: 0,
      commentsCount: 0,
    });
    console.log("Blog published ✅", docRef.id);
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error("Error:", error);
    return { id: null, error };
  }
};

export const updateBlog = async (blogId, updatedData) => {
  try {
    const blogRef = doc(db, BLOGS_COL, blogId);
    await updateDoc(blogRef, {
      ...updatedData,
      updatedAt: serverTimestamp(),
    });
    console.log("Blog updated ✅", blogId);
    return { error: null };
  } catch (error) {
    console.error("Update failed:", error);
    return { error };
  }
};

export const getBlog = async (blogId) => {
  try {
    const snap = await getDoc(doc(db, BLOGS_COL, blogId));
    if (snap.exists()) return { id: snap.id, ...snap.data() };
    return null;
  } catch (error) {
    console.error("Fetch blog failed:", error);
    return null;
  }
};

// ─── Follow System ────────────────────────────────────────────────────────────
export const followAuthor = async (currentUserId, authorId) => {
  try {
    // 1. Update following list
    await setDoc(doc(db, FOLLOWS_COL, currentUserId), {
      following: arrayUnion(authorId),
    }, { merge: true });

    // 2. Increment counts on both users
    await updateDoc(doc(db, USERS_COL, currentUserId), { followingCount: increment(1) });
    await updateDoc(doc(db, USERS_COL, authorId), { followersCount: increment(1) });

    return { error: null };
  } catch (error) { return { error }; }
};

export const unfollowAuthor = async (currentUserId, authorId) => {
  try {
    // 1. Update following list
    await setDoc(doc(db, FOLLOWS_COL, currentUserId), {
      following: arrayRemove(authorId),
    }, { merge: true });

    // 2. Decrement counts on both users
    await updateDoc(doc(db, USERS_COL, currentUserId), { followingCount: increment(-1) });
    await updateDoc(doc(db, USERS_COL, authorId), { followersCount: increment(-1) });

    return { error: null };
  } catch (error) { return { error }; }
};

export const getFollowing = async (userId) => {
  try {
    const snap = await getDoc(doc(db, FOLLOWS_COL, userId));
    return snap.exists() ? (snap.data().following || []) : [];
  } catch { return []; }
};

export const subscribeToFollowedBlogs = (userId, setBlogs) => {
  getFollowing(userId).then((following) => {
    if (!following.length) {
      setBlogs([]);
      return;
    }
    // Firestore 'in' supports up to 30 items
    const q = query(
      collection(db, BLOGS_COL),
      where("authorId", "in", following.slice(0, 30))
    );
    onSnapshot(q, (snapshot) => {
      setBlogs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  });
};

// ─── LIKES (Real-time Subcollection Pattern) ─────────────────────────────────
export const toggleLike = async (blogId, userId) => {
  if (!userId) return;
  const likeRef = doc(db, BLOGS_COL, blogId, "likes", userId);
  const blogRef = doc(db, BLOGS_COL, blogId);
  try {
    const snap = await getDoc(likeRef);
    if (snap.exists()) {
      // Unlike: remove sub-doc and decrement count
      await deleteDoc(likeRef);
      await updateDoc(blogRef, { likesCount: increment(-1) });
      return false;
    } else {
      // Like: add sub-doc and increment count
      await setDoc(likeRef, { userId, createdAt: Date.now() });
      await updateDoc(blogRef, { likesCount: increment(1) });
      return true;
    }
  } catch (error) {
    console.error("Toggle like failed:", error);
    return null;
  }
};

export const isBlogLiked = async (blogId, userId) => {
  if (!userId) return false;
  const likeRef = doc(db, BLOGS_COL, blogId, "likes", userId);
  const snap = await getDoc(likeRef);
  return snap.exists();
};

export const subscribeToLikesCount = (blogId, setCount) => {
  const ref = collection(db, BLOGS_COL, blogId, "likes");
  return onSnapshot(ref, (snap) => {
    setCount(snap.size);
  });
};

export const subscribeToUserLike = (blogId, userId, setLiked) => {
  if (!userId) return;
  const ref = doc(db, BLOGS_COL, blogId, "likes", userId);
  return onSnapshot(ref, (snap) => {
    setLiked(snap.exists());
  });
};

export const subscribeToUserProfile = (uid, setProfile) => {
  if (!uid) return;
  return onSnapshot(doc(db, USERS_COL, uid), (snap) => {
    if (snap.exists()) setProfile({ uid: snap.id, ...snap.data() });
  });
};

export const subscribeToUserArticles = (userId, setArticles) => {
  const q = query(
    collection(db, BLOGS_COL),
    where("authorId", "==", userId)
  );
  return onSnapshot(q, (snapshot) => {
    setArticles(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const subscribeToUserActivity = (userId, setActivity) => {
  const q = query(
    collection(db, COMMENTS_COL),
    where("userId", "==", userId)
  );
  return onSnapshot(q, (snapshot) => {
    setActivity(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const subscribeToUserLikes = (userId, setLikedArticles) => {
  // 💎 Collection Group Query: Finds all 'likes' docs across all articles where userId matches
  const q = query(collectionGroup(db, "likes"), where("userId", "==", userId));

  return onSnapshot(q, async (snapshot) => {
    const blogIds = snapshot.docs.map(doc => doc.ref.parent.parent.id);
    if (!blogIds.length) {
      setLikedArticles([]);
      return;
    }

    // Fetch the actual article contents for those IDs
    // Firestore 'in' query is limited to 10-30 IDs usually, but perfect for dashboard recent likes
    const blogsQuery = query(collection(db, BLOGS_COL), where("__name__", "in", blogIds.slice(0, 30)));
    onSnapshot(blogsQuery, (snap) => {
      setLikedArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  });
};

// ─── COMMENTS (Real-time & Global) ───────────────────────────────────────────
export const addComment = async (blogId, content, user) => {
  if (!user?.uid) return { error: "Login required" };
  try {
    await addDoc(collection(db, COMMENTS_COL), {
      blogId,
      userId: user.uid,
      userName: user.displayName || user.name || "Anonymous",
      userAvatar: user.photoURL || user.avatar || null,
      content,
      createdAt: serverTimestamp(),
    });
    // Sync count on parent blog
    await updateDoc(doc(db, BLOGS_COL, blogId), {
      commentsCount: increment(1)
    });
    return { error: null };
  } catch (error) {
    console.error("Comment post failed:", error);
    return { error };
  }
};

export const deleteComment = async (commentId, blogId) => {
  try {
    await deleteDoc(doc(db, COMMENTS_COL, commentId));
    // Sync count on parent blog
    if (blogId) {
      await updateDoc(doc(db, BLOGS_COL, blogId), {
        commentsCount: increment(-1)
      });
    }
    return { error: null };
  } catch (error) {
    console.error("Delete comment failed:", error);
    return { error };
  }
};

export const deleteBlog = async (blogId) => {
  try {
    await deleteDoc(doc(db, BLOGS_COL, blogId));
    return { error: null };
  } catch (error) {
    console.error("Delete blog failed:", error);
    return { error };
  }
};

export const subscribeToComments = (blogId, setComments) => {
  const q = query(
    collection(db, COMMENTS_COL),
    where("blogId", "==", blogId)
  );
  return onSnapshot(q, (snapshot) => {
    setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ─── SAVES / BOOKMARKS (Persistent) ──────────────────────────────────────────
export const toggleSave = async (blogId, userId) => {
  if (!userId) return { error: "Login required" };
  const saveId = `${userId}_${blogId}`;
  const saveRef = doc(db, SAVES_COL, saveId);
  try {
    const snap = await getDoc(saveRef);
    if (snap.exists()) {
      await deleteDoc(saveRef);
      return { saved: false };
    } else {
      await setDoc(saveRef, { userId, blogId, createdAt: serverTimestamp() });
      return { saved: true };
    }
  } catch (error) { return { error }; }
};

export const isBlogSaved = async (blogId, userId) => {
  if (!userId) return false;
  const saveId = `${userId}_${blogId}`;
  const snap = await getDoc(doc(db, SAVES_COL, saveId));
  return snap.exists();
};

export const subscribeToSavedBlogs = (userId, setBlogs) => {
  const q = query(collection(db, SAVES_COL), where("userId", "==", userId));
  return onSnapshot(q, async (snapshot) => {
    const blogIds = snapshot.docs.map(d => d.data().blogId);
    if (!blogIds.length) {
      setBlogs([]);
      return;
    }
    const blogsQuery = query(collection(db, BLOGS_COL), where("__name__", "in", blogIds));
    const blogSnaps = await getDocs(blogsQuery);
    setBlogs(blogSnaps.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ─── CHAT / MESSAGING (Real-time & Persistent) ───────────────────────────────

export const getConversationId = (uid1, uid2) => {
  return [uid1, uid2].sort().join("_");
};

export const sendMessage = async (convoId, sender, text, receiver) => {
  try {
    const messageRef = collection(db, CONVOS_COL, convoId, MESSAGES_COL);
    await addDoc(messageRef, {
      senderId: sender.uid,
      text,
      createdAt: serverTimestamp(),
    });

    // Update conversation metadata with names/avatars for the list view
    // Also increment server-side unread counter for the RECEIVER
    await setDoc(doc(db, CONVOS_COL, convoId), {
      participants: arrayUnion(sender.uid, receiver.id),
      participantInfo: {
        [sender.uid]: {
          name: sender.displayName || sender.name || "User",
          avatar: sender.photoURL || sender.avatar || null
        },
        [receiver.id]: {
          name: receiver.name || receiver.displayName || "User",
          avatar: receiver.avatar || receiver.photoURL || null
        }
      },
      lastMessage: text,
      lastMessageTime: serverTimestamp(),
      lastSenderId: sender.uid,
    }, { merge: true });

    // Increment unread count for the receiver (server-side persistent)
    try {
      await updateDoc(doc(db, CONVOS_COL, convoId), {
        [`unreadCount.${receiver.id}`]: increment(1),
      });
    } catch {
      // If doc doesn't exist yet, set it
      await setDoc(doc(db, CONVOS_COL, convoId), {
        unreadCount: { [receiver.id]: 1 },
      }, { merge: true });
    }

    return { error: null };
  } catch (error) { return { error }; }
};

export const subscribeToMessages = (convoId, setMessages) => {
  const q = query(
    collection(db, CONVOS_COL, convoId, MESSAGES_COL),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => {
    console.error("Messages sync failed:", err.message);
    setMessages([]);
  });
};

export const subscribeToConversations = (userId, setConvos) => {
  // No orderBy here — avoids composite index requirement
  const q = query(
    collection(db, CONVOS_COL),
    where("participants", "array-contains", userId)
  );
  return onSnapshot(q, (snapshot) => {
    const convos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort client-side by lastMessageTime (newest first)
    convos.sort((a, b) => {
      const ta = a.lastMessageTime?.seconds || 0;
      const tb = b.lastMessageTime?.seconds || 0;
      return tb - ta;
    });
    setConvos(convos);
  }, (err) => {
    console.error("Conversations sync failed:", err.message);
    setConvos([]);
  });
};

// ─── Clear unread count (server-side) ─────────────────────────────────────
export const clearUserUnread = async (convoId, userId) => {
  try {
    await updateDoc(doc(db, CONVOS_COL, convoId), {
      [`unreadCount.${userId}`]: 0,
    });
  } catch (err) {
    console.warn("clearUserUnread failed:", err.message);
  }
};

// ─── One-time fetch (fallback for Search) ─────────────────────────────────────
export const fetchArticles = async () => {
  try {
    const q = query(collection(db, BLOGS_COL), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return mockArticles;
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    return mockArticles;
  }
};

// ─── Real-time single blog doc (for Reader/Comments count sync) ────────────────
export const subscribeToBlogDoc = (blogId, setData) => {
  return onSnapshot(doc(db, BLOGS_COL, blogId), (snap) => {
    if (snap.exists()) setData({ id: snap.id, ...snap.data() });
  });
};

// ─── Fix stale commentsCount by counting real comments ────────────────────────
export const recalculateCommentsCount = async (blogId) => {
  try {
    const q = query(collection(db, COMMENTS_COL), where("blogId", "==", blogId));
    const snap = await getDocs(q);
    const realCount = snap.size;
    await updateDoc(doc(db, BLOGS_COL, blogId), { commentsCount: realCount });
    return realCount;
  } catch (err) {
    console.error("Recalculate failed:", err);
    return null;
  }
};

// ─── User Search ─────────────────────────────────────────────────────────────
export const searchUsersByName = async (searchTerm) => {
  if (!searchTerm) return [];
  try {
    const q = query(
      collection(db, USERS_COL),
      where("name", ">=", searchTerm),
      where("name", "<=", searchTerm + "\uf8ff")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch (err) {
    console.warn("Search users failed:", err);
    return [];
  }
};

