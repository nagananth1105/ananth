import axios from 'axios';
import React, { createContext, useContext, useEffect, useState } from 'react';

// Create the authentication context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Function to register a new user
  const register = async (name, email, password, role = 'student') => {
    try {
      setError('');
      const response = await axios.post('/api/auth/register', {
        name,
        email,
        password,
        role
      });
      
      const { token: authToken, user } = response.data;
      
      // Save token to localStorage and state
      localStorage.setItem('token', authToken);
      setToken(authToken);
      setCurrentUser(user);
      
      return user;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      throw new Error(message);
    }
  };

  // Function to login
  const login = async (email, password) => {
    try {
      setError('');
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });
      
      const { token: authToken, user } = response.data;
      
      // Save token to localStorage and state
      localStorage.setItem('token', authToken);
      setToken(authToken);
      setCurrentUser(user);
      
      return user;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw new Error(message);
    }
  };

  // Function to logout
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
  };

  // Configure axios to use the token for all requests
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['x-auth-token'] = token;
    } else {
      delete axios.defaults.headers.common['x-auth-token'];
    }
  }, [token]);

  // Load user data on app startup
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await axios.get('/api/auth/me');
        setCurrentUser(res.data.user);
      } catch (err) {
        console.error('Error loading user', err);
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, [token]);

  // Context values to be provided
  const value = {
    currentUser,
    loading,
    error,
    register,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};