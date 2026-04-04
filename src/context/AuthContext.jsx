import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('inkwell_user');
    return saved ? JSON.parse(saved) : null;
  });

  const signIn = (name, email) => {
    const u = { name, email };
    localStorage.setItem('inkwell_user', JSON.stringify(u));
    localStorage.setItem('inkwell_user_name', name);
    setUser(u);
  };

  const signOut = () => {
    localStorage.removeItem('inkwell_user');
    localStorage.removeItem('inkwell_user_name');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
