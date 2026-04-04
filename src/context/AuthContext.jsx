import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email,
          avatar: firebaseUser.photoURL,
        });
        localStorage.setItem('inkwell_user_name', firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User');
      } else {
        // Fall back to localStorage user (for non-Google login)
        const saved = localStorage.getItem('inkwell_user');
        setUser(saved ? JSON.parse(saved) : null);
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

  // Manual login (localStorage only)
  const signIn = (name, email) => {
    const u = { name, email };
    localStorage.setItem('inkwell_user', JSON.stringify(u));
    localStorage.setItem('inkwell_user_name', name);
    setUser(u);
  };

  // Sign out (both Firebase + local)
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {}
    localStorage.removeItem('inkwell_user');
    localStorage.removeItem('inkwell_user_name');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, signIn, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
