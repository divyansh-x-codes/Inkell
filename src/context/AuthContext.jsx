import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Listen to Firebase auth state
  useEffect(() => {
    // 1. Check for redirect results (Google login on mobile)
    getRedirectResult(auth).catch(err => console.error("Redirect error:", err));

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // ... fetching profile ...
        let profileData = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email,
          avatar: firebaseUser.photoURL,
        };

        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userRef);

          if (snap.exists()) {
            profileData = { ...profileData, ...snap.data() };
          } else {
            // First time login - sync info
            await syncUserToFirestore(firebaseUser);
          }
        } catch (err) {
          console.error("Profile sync failed:", err);
        }

        setUser(profileData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
    <AuthContext.Provider value={{ user, loading, signUp, logIn, loginWithGoogle, signIn, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
