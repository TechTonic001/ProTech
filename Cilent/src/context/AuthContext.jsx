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
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/profile');
      if (response?.data?.user) {
        setUser(response.data.user);
        localStorage.setItem('protech_user', JSON.stringify(response.data.user));
      } else {
        logout();
      }
    } catch (error) {
      logout();
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
