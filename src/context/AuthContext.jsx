import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Capacitor } from '@capacitor/core';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // 1. Safety Timeout: Force-load the app if Supabase is hanging (e.g. poor connection)
    const safetyTimer = setTimeout(() => {
      console.warn("Auth initialisation timed out. Force loading...");
      setLoading(false);
    }, 5000);

    // 2. Initial Session Check
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchAndSetUser(session.user);
        }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        setLoading(false);
        clearTimeout(safetyTimer);
      }
    };

    checkSession();

    // 3. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchAndSetUser(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
      clearTimeout(safetyTimer);
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const fetchAndSetUser = async (sbUser) => {
    // Optimistic UI: Unlock the loading screen INSTANTLY so user can enter the app
    setUser(sbUser);
    setLoading(false);

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sbUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching profile:", error);
      }

      if (profile) {
        // Silently enrich the user object with their profile in the background
        setUser(prev => prev ? { ...prev, profiles: profile } : { ...sbUser, profiles: profile });
      } else {
        setUser(prev => prev ? { ...prev, profiles: null } : { ...sbUser, profiles: null });
      }
    } catch (err) {
      console.error("Profile fetch failed:", err);
    }
  };

  // ── Global real-time unread counter ────────────────────────────────
  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    // Subscribe to new messages for this user
    // In Supabase, we'd check notifications or messages in circles the user is in
    const messageChannel = supabase
      .channel('unread-count')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Increment or refetch count
          fetchUnreadCount();
        }
      )
      .subscribe();

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [user?.id]);

  // Email/Password Auth
  const signUp = async (name, email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          }
        }
      });
      // Force manual session update to guarantee instant navigation bypassing the listener
      if (data?.user && !error) fetchAndSetUser(data.user);
      return { user: data?.user, error };
    } catch (error) {
      return { user: null, error };
    }
  };

  const logIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      // Force manual session update to guarantee instant navigation bypassing the listener
      if (data?.user && !error) fetchAndSetUser(data.user);
      return { user: data?.user, error };
    } catch (error) {
      return { user: null, error };
    }
  };

  // Google Sign In
  const loginWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: Capacitor.isNativePlatform() 
            ? 'com.inktrix.app://login' 
            : window.location.origin
        }
      });
      return { data, error };
    } catch (error) {
      console.error("Google Login Error:", error);
      return { user: null, error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Sign out error", error);
    }
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchAndSetUser(session.user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, unreadCount, signUp, logIn, loginWithGoogle, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

