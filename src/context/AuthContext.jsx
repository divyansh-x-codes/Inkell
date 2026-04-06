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
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
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

    // ─── SESSION-HINT SHIELD ────────────────────────
    // If we think the user is logged in, we SHIELD the null answer from Firebase
    // for at least 1-2 seconds to give it time to find the session.
    const hasSessionHint = safeStorage.get('inktrix_logged_in') === 'true';
    let shieldTimer = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (shieldTimer) clearTimeout(shieldTimer); // Cancel shield early
        safeStorage.set('inktrix_logged_in', 'true');
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...snap.data() });
          } else {
            await syncUserToFirestore(firebaseUser);
            setUser({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email,
              avatar: firebaseUser.photoURL,
            });
          }
        } catch (err) {
          console.error("Initial profile fetch failed:", err);
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
        }
        setLoading(false); // 🔥 UNLOCK IMMEDIATELY (We have a user)
      } else {
        // 🔥 NULL USER (LOGGED OUT) 🔥
        // If we have a hint, we wait for a bit before accepting the 'null'.
        if (hasSessionHint) {
          if (!shieldTimer) {
            shieldTimer = setTimeout(() => {
              safeStorage.set('inktrix_logged_in', 'false');
              setUser(null);
              setLoading(false); // 🚨 UNLOCK AFTER SHIELD EXPIRES
            }, 2000); // 2s Grace Period for session retrieval
          }
        } else {
          safeStorage.set('inktrix_logged_in', 'false');
          setUser(null);
          setLoading(false); // 🚨 UNLOCK IMMEDIATELY (No hint)
        }
      }
    });

    // ─── HARD FAIL-SAFE (STRICT 5s) ───
    const timer = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn("AuthProvider: Hard Fail-Safe Unlocked after 5s");
          return false;
        }
        return prev;
      });
    }, 5000);

    return () => {
      unsubscribeAuth();
      clearTimeout(timer);
      if (shieldTimer) clearTimeout(shieldTimer);
    };
  }, []);

  // ── BACKGROUND Listen Real-time for profile changes (Silent sync) ──
  useEffect(() => {
    if (!user?.uid) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUser((prev) => {
          if (!prev) return { uid: user.uid, ...data };
          // Prevent infinite loop
          if (JSON.stringify(prev) === JSON.stringify({ ...prev, ...data })) return prev;
          return { ...prev, ...data };
        });
      }
    }, (err) => console.warn("Background profile sync failed:", err));

    return () => unsubProfile();
  }, [user?.uid]);

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
      // 🔥 CRITICAL: Must await sync for new users before they try to edit profile
      await syncUserToFirestore(result.user, { name });
      const fullProfile = { uid: result.user.uid, name, email: result.user.email };
      setUser(fullProfile); // Set early so app responds fast
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
        return { user: null, error: null }; 
      } else {
        const result = await signInWithPopup(auth, provider);
        // 🔥 Priming sync for Google users in popup mode
        await syncUserToFirestore(result.user);
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
      {children}
    </AuthContext.Provider>
  );
};
