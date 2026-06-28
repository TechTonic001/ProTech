// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('protech_user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('protech_token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const login = (authToken, authUser) => {
    localStorage.setItem('protech_token', authToken);
    localStorage.setItem('protech_user', JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);
  };

  const logout = () => {
    const role = user?.role;
    localStorage.removeItem('protech_token');
    localStorage.removeItem('protech_user');
    setToken(null);
    setUser(null);
    if (role === 'admin') {
      navigate('/admin/login');
    } else if (role === 'tenant') {
      navigate('/tenant/login');
    } else if (role === 'landlord') {
      navigate('/landlord/login');
    } else {
      navigate('/');
    }
  };

  const loadUser = async () => {
    const storedToken = localStorage.getItem('protech_token');
    const storedUser = localStorage.getItem('protech_user');
    const parsedStoredUser = storedUser ? JSON.parse(storedUser) : null;
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/profile');
      if (response?.data?.user) {
        const updatedUser = {
          ...parsedStoredUser,
          ...response.data.user,
        };
        setUser(updatedUser);
        localStorage.setItem('protech_user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      // The Axios interceptor in api.js already handles 401s (clears storage + redirects).
      // Do NOT call logout() here — a network error (e.g. Neon cold start, timeout) must
      // not destroy the user's session. Just silently fail and keep existing state.
      console.warn('[AuthContext] Profile refresh failed:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, token, setToken, loading, loadUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
