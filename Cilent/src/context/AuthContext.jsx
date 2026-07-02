// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export const AuthContext = createContext(null);

// Safe JSON.parse wrapper — prevents a SyntaxError crash if localStorage is
// tampered with or contains invalid data (OWASP A03 / V8 fix).
const safeParseJSON = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => safeParseJSON(localStorage.getItem('protech_user')));
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
    const parsedStoredUser = safeParseJSON(localStorage.getItem('protech_user'));
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

