import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync user info to Firestore "users" collection
  const syncUserToFirestore = async (firebaseUser) => {
    if (!firebaseUser) return;
    const userRef = doc(db, 'users', firebaseUser.uid);
    await setDoc(userRef, {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || 'Anonymous',
      email: firebaseUser.email,
      avatar: firebaseUser.photoURL,
      lastLogin: serverTimestamp(),
    }, { merge: true });
  };

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const u = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email,
          avatar: firebaseUser.photoURL,
        };
        setUser(u);
        // Sync profile data in the background
        syncUserToFirestore(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Google Sign In
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      return { user: result.user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  };

  // Skip manual signIn (legacy local storage auth removed for consistency)
  const signIn = (name, email) => {
    // This is now deprecated in favor of Firebase Auth
    console.warn("Manual sign-in is deprecated. Use loginWithGoogle.");
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
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, signIn, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
