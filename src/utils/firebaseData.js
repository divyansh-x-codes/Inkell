import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  setDoc,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { articles as mockArticles } from "../data";

const BLOGS_COL = "blogs";
const FOLLOWS_COL = "follows";

// ─── Real-time feed (onSnapshot) ─────────────────────────────────────────────
// Returns an unsubscribe function. Calls setBlogs on every update.
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

// ─── One-time fetch (fallback) ────────────────────────────────────────────────
export const fetchArticles = async () => {
  try {
    const q = query(collection(db, BLOGS_COL), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return mockArticles;
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn("Firestore fetch failed, using mock data:", err.message);
    return mockArticles;
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
      likes: 0,
    });
    console.log("Blog published ✅", docRef.id);
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error("Error:", error);
    return { id: null, error };
  }
};

// ─── Follow System ────────────────────────────────────────────────────────────

// Follow an author
export const followAuthor = async (currentUserId, authorId) => {
  try {
    await setDoc(doc(db, FOLLOWS_COL, currentUserId), {
      following: arrayUnion(authorId),
    }, { merge: true });
    return { error: null };
  } catch (error) {
    return { error };
  }
};

// Unfollow an author
export const unfollowAuthor = async (currentUserId, authorId) => {
  try {
    await setDoc(doc(db, FOLLOWS_COL, currentUserId), {
      following: arrayRemove(authorId),
    }, { merge: true });
    return { error: null };
  } catch (error) {
    return { error };
  }
};

// Get list of author IDs the user is following
export const getFollowing = async (userId) => {
  try {
    const snap = await getDoc(doc(db, FOLLOWS_COL, userId));
    return snap.exists() ? (snap.data().following || []) : [];
  } catch {
    return [];
  }
};

// Real-time filtered feed — only from followed authors
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
