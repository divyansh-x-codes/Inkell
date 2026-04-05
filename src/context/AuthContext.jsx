import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  GoogleAuthProvider,
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { subscribeToConversations } from '../utils/firebaseData';

// Safe Storage Wrapper (BEST FIX)
export const safeStorage = {
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      console.warn("Storage blocked");
    }
  },
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
};

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Sync user info to Firestore "users" collection
  const syncUserToFirestore = async (firebaseUser, additionalInfo = {}) => {
    if (!firebaseUser) return;
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userData = {
      uid: firebaseUser.uid,
      name: additionalInfo.name || firebaseUser.displayName || 'Anonymous',
      email: firebaseUser.email,
      avatar: firebaseUser.photoURL || null,
      lastLogin: serverTimestamp(),
    };

    // Only set non-null additional info
    Object.keys(additionalInfo).forEach(key => {
      if (additionalInfo[key] !== undefined) userData[key] = additionalInfo[key];
    });

    await setDoc(userRef, userData, { merge: true });
    return userData;
  };

  // ─── CRITICAL PERSISTENCE (LOCAL & SAFARI FALLBACK) ────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (err) {
        console.warn("Local persistence failed, falling back to session:", err);
        try {
          await setPersistence(auth, browserSessionPersistence);
        } catch (e) {
          console.error("Critical: Auth persistence totally blocked", e);
        }
      }
    };
    initAuth();
  }, []);

  // Listen to Firebase auth state
  useEffect(() => {
    // 1. Check for redirect results (Google login on mobile)
    getRedirectResult(auth).then(res => {
      if (res?.user) console.log("Redirect success for:", res.user.email);
    }).catch(err => console.error("Redirect error:", err));

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // 2. Proactive sync for new users
        syncUserToFirestore(firebaseUser);

        // 3. LISTEN Real-time for profile changes
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubProfile = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...snap.data()
            });
          } else {
            // Initial signup sync
            setUser({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email,
              avatar: firebaseUser.photoURL,
            });
          }
          setLoading(false);
        });

        // Cleanup profile listener when auth changes
        return () => unsubProfile();
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ── Global real-time unread counter ────────────────────────────────
  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }
    const unsub = subscribeToConversations(user.uid, (convos) => {
      let total = 0;
      convos.forEach(c => {
        const myUnread = c.unreadCount?.[user.uid] || 0;
        total += myUnread;
      });
      setUnreadCount(total);
    });
    return () => unsub();
  }, [user?.uid]);

  // Email/Password Auth
  const signUp = async (name, email, password) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Immediately sync with the provided name
      await syncUserToFirestore(result.user, { name });
      return { user: result.user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  };

  const logIn = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { user: result.user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  };

  // Google Sign In
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    try {
      if (isMobile) {
        await signInWithRedirect(auth, provider);
        return { user: null, error: null }; // result handled by getRedirectResult
      } else {
        const result = await signInWithPopup(auth, provider);
        return { user: result.user, error: null };
      }
    } catch (error) {
      return { user: null, error };
    }
  };

  // Legacy local sign-in removed for security/persistence
  const signIn = (name, email) => {
    console.error("Legacy signIn called. Use signUp or logIn.");
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Sign out error", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, unreadCount, signUp, logIn, loginWithGoogle, signIn, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
