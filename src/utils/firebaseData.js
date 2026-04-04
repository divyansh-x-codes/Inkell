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
    console.warn("Real-time feed failed, using mock data:", err.message);
    setBlogs(mockArticles);
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

// ─── Follow System ────────────────────────────────────────────────────────────
export const followAuthor = async (currentUserId, authorId) => {
  try {
    await setDoc(doc(db, FOLLOWS_COL, currentUserId), {
      following: arrayUnion(authorId),
    }, { merge: true });
    return { error: null };
  } catch (error) { return { error }; }
};

export const unfollowAuthor = async (currentUserId, authorId) => {
  try {
    await setDoc(doc(db, FOLLOWS_COL, currentUserId), {
      following: arrayRemove(authorId),
    }, { merge: true });
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
    const q = query(
      collection(db, BLOGS_COL),
      where("authorId", "in", following),
      orderBy("createdAt", "desc")
    );
    onSnapshot(q, (snapshot) => {
      setBlogs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  });
};

// ─── LIKES (Persistent & Global) ──────────────────────────────────────────────
export const toggleLike = async (blogId, userId) => {
  if (!userId) return { error: "Login required" };
  const likeId = `${userId}_${blogId}`;
  const likeRef = doc(db, LIKES_COL, likeId);
  const blogRef = doc(db, BLOGS_COL, blogId);

  try {
    const snap = await getDoc(likeRef);
    if (snap.exists()) {
      await deleteDoc(likeRef);
      await updateDoc(blogRef, { likesCount: increment(-1) });
      return { liked: false };
    } else {
      await setDoc(likeRef, { userId, blogId, createdAt: serverTimestamp() });
      await updateDoc(blogRef, { likesCount: increment(1) });
      return { liked: true };
    }
  } catch (error) { return { error }; }
};

export const isBlogLiked = async (blogId, userId) => {
  if (!userId) return false;
  const likeId = `${userId}_${blogId}`;
  const snap = await getDoc(doc(db, LIKES_COL, likeId));
  return snap.exists();
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
    await updateDoc(doc(db, BLOGS_COL, blogId), { commentsCount: increment(1) });
    return { error: null };
  } catch (error) { return { error }; }
};

export const subscribeToComments = (blogId, setComments) => {
  const q = query(
    collection(db, COMMENTS_COL),
    where("blogId", "==", blogId),
    orderBy("createdAt", "asc")
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
  });
};

export const subscribeToConversations = (userId, setConvos) => {
  const q = query(
    collection(db, CONVOS_COL),
    where("participants", "array-contains", userId),
    orderBy("lastMessageTime", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    setConvos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  });
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
