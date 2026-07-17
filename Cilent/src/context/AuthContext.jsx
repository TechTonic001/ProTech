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
  const [user, setUser]       = useState(() => safeParseJSON(localStorage.getItem('protech_user')));
  // protech_token now holds the short-lived ACCESS token (15m).
  // The long-lived refresh token lives in an HttpOnly cookie — never touched by JS.
  const [token, setToken]     = useState(() => localStorage.getItem('protech_token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * login — called after a successful /auth/login or /auth/register response.
   * Stores the short-lived access token and user profile in localStorage.
   * The refresh token has already been set as an HttpOnly cookie by the server.
   *
   * @param {string} accessToken  - The 15-minute JWT from the server response.
   * @param {object} authUser     - The user object from the server response.
   */
  const login = (accessToken, authUser) => {
    localStorage.setItem('protech_token', accessToken);
    localStorage.setItem('protech_user', JSON.stringify(authUser));
    setToken(accessToken);
    setUser(authUser);
  };

  /**
   * logout — clears the access token from localStorage and asks the server to
   * expire the HttpOnly refresh token cookie.  The Axios interceptor has
   * withCredentials: true, so the cookie is sent along with the POST.
   *
   * We intentionally fire-and-forget the server call: even if the network
   * request fails, the local session is still destroyed.
   */
  const logout = async () => {
    const role = user?.role;

    // Best-effort: tell the server to clear the HttpOnly refresh-token cookie.
    try {
      await api.post('/auth/logout');
    } catch {
      // Network failure during logout is not fatal — local state is cleared regardless.
    }

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
      // The Axios interceptor in api.js handles 401s:
      //   1. It silently calls /auth/refresh to get a new access token.
      //   2. Only if the refresh also fails does it clear storage + redirect.
      // Do NOT call logout() here — a network error (e.g. Neon cold start, timeout)
      // must not destroy the user's session. Silently fail and keep existing state.
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
