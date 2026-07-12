import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Create the Context
const AuthContext = createContext();

// 2. Create a Custom Hook for easy access
export const useAuth = () => {
  return useContext(AuthContext);
};

// 3. Create the Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // When the app first loads, check if a user is already saved in localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Centralized Login Function
  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData); // This triggers the instant UI update!
  };

  // Centralized Logout Function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null); // This instantly clears the UI!
  };

  const value = {
    user,
    login,
    logout
  };

  if (loading) return null; // Or a quick loading spinner while checking storage

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};