import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  where 
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch and sync user with Firestore profile in background
  const fetchAndSetUser = async (fbUser) => {
    // 1. SET BASIC USER IMMEDIATELY
    const basicUser = { 
      uid: fbUser.uid, 
      id: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      photoURL: fbUser.photoURL,
      isAnonymous: fbUser.isAnonymous,
      emailVerified: fbUser.emailVerified,
      profiles: null // Loaded in background
    };
    setUser(basicUser);
    setLoading(false); // UI UNLOCKED INSTANTLY

    // 2. FETCH PROFILE IN BACKGROUND
    const profileRef = doc(db, 'profiles', fbUser.uid);
    try {
      const profileSnap = await getDoc(profileRef);
      let userData = { ...basicUser };

      if (profileSnap.exists()) {
        userData.profiles = profileSnap.data();
      } else {
        const emailPrefix = fbUser.email ? fbUser.email.split('@')[0] : `user_${fbUser.uid.substring(0, 5)}`;
        const newProfile = {
          id: fbUser.uid,
          username: emailPrefix,
          name: fbUser.displayName || emailPrefix,
          avatar_url: fbUser.photoURL || null,
          bio: 'Sharing stories on Inktrix.',
          created_at: new Date().toISOString()
        };
        await setDoc(profileRef, newProfile);
        userData.profiles = newProfile;
      }
      setUser(userData); // Update with full profile when ready
    } catch (err) {
      console.error("Profile sync failed in background:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Initial State Sync
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;
      if (firebaseUser) {
        console.log('User signed in, performing background sync...');
        await fetchAndSetUser(firebaseUser);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // 2. Handle Redirect Results (Crucial for Social Login)
    getRedirectResult(auth).then(async (result) => {
      if (!isMounted || !result?.user) return;
      await fetchAndSetUser(result.user);
      window.location.href = "/home"; // Hard redirect for reliability
    }).catch(console.error);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // ── Global real-time unread counter (Notifications) ────────────────
  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'), 
      where('user_id', '==', user.uid),
      where('is_read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Email/Password Auth
  const signUp = async (name, email, password) => {
    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      
      // Add displayName to Firebase Auth user
      await firebaseUpdateProfile(fbUser, { displayName: name });
      
      // Manually trigger profile creation and wait for it
      await fetchAndSetUser(fbUser);
      
      return { user: fbUser, error: null };
    } catch (error) {
      console.error("SignUp Error:", error);
      setLoading(false);
      return { user: null, error };
    }
  };

  const logIn = async (email, password) => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      await fetchAndSetUser(fbUser);
      return { user: fbUser, error: null };
    } catch (error) {
      console.error("Login Error:", error);
      setLoading(false);
      return { user: null, error };
    }
  };

  // Google Sign In (Web only for now)
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await fetchAndSetUser(result.user);
      return { user: result.user, error: null };
    } catch (error) {
      console.error("Google login error:", error);
      setLoading(false);
      return { user: null, error };
    }
  };

  // Demo Mode Bypass (Now using real Firebase Anonymous Auth)
  const loginAsDemoUser = async () => {
    try {
      setLoading(true);
      const userCredential = await signInAnonymously(auth);
      const fbUser = userCredential.user;
      
      // Auto-set some friendly demo names if not already set
      if (!fbUser.displayName) {
        await firebaseUpdateProfile(fbUser, { displayName: 'Demo User' });
      }
      
      await fetchAndSetUser(fbUser);
      return { user: fbUser, error: null };
    } catch (error) {
      console.error("Demo Login Error:", error);
      setLoading(false);
      return { user: null, error };
    }
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

  const refreshUser = async () => {
    if (auth.currentUser) {
      await fetchAndSetUser(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, unreadCount, signUp, logIn, loginAsDemoUser, loginWithGoogle, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}


