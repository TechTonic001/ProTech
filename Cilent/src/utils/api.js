// src/utils/api.js
import axios from 'axios';

const getBaseURL = () => {
  const configured = (import.meta.env.VITE_API_URL || '').trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return '/api';
};

const BASE_URL = getBaseURL();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 100000,
  headers: { 'Content-Type': 'application/json' },
  // withCredentials MUST be true so the browser includes the HttpOnly refreshToken
  // cookie on every request — including the /auth/refresh call.
  withCredentials: true,
});

// ── Request interceptor ───────────────────────────────────────────────────────
// Attaches the short-lived access token to every outbound request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('protech_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Silent refresh state ──────────────────────────────────────────────────────
// isRefreshing — prevents multiple simultaneous refresh calls (one token refresh at a time).
// failedRequestsQueue — holds resolve/reject callbacks for requests that hit 401
//   while a refresh is already in flight; they are replayed once the new token arrives.
let isRefreshing = false;
let failedRequestsQueue = [];

/**
 * Flush the queue of paused requests.
 * @param {Error|null} error  - If set, reject all queued promises.
 * @param {string|null} token - If set, resolve all queued promises with the new token.
 */
const flushQueue = (error, token = null) => {
  failedRequestsQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedRequestsQueue = [];
};

/**
 * Determine the correct login path for the current page so we can redirect
 * to the matching portal after a hard session expiry.
 */
const getLoginPath = () => {
  const path = window.location.pathname;
  if (path.startsWith('/admin'))  return '/admin/login';
  if (path.startsWith('/tenant')) return '/tenant/login';
  return '/landlord/login';
};

/**
 * Hard logout — clear all local auth state and redirect to login.
 * Called only when the refresh token itself is expired/invalid.
 */
const forceLogout = () => {
  localStorage.removeItem('protech_token');
  localStorage.removeItem('protech_user');
  const publicPaths = [
    '/landlord/login', '/landlord/register',
    '/tenant/login',   '/tenant/register',
    '/admin/login',
    '/forgot-password', '/verify-otp', '/reset-success', '/',
  ];
  if (!publicPaths.includes(window.location.pathname)) {
    window.location.href = getLoginPath();
  }
};

// ── Response interceptor ──────────────────────────────────────────────────────
api.interceptors.response.use(
  // 2xx — pass through unchanged
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // ── Network / non-HTTP errors ─────────────────────────────────────────────
    const isNetworkError =
      !error.response &&
      (error.message?.includes('Network Error') ||
        error.message?.includes('timeout') ||
        error.message?.includes('Network request failed'));

    if (isNetworkError) {
      return Promise.reject(new Error('Please check your internet connection.'));
    }

    // ── Non-401 errors — pass through with a clean message ───────────────────
    if (error.response?.status !== 401) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Something went wrong';
      return Promise.reject(new Error(message));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 401 Handling — attempt a silent token refresh UNLESS:
    //   a) this request is already a retry (_retry flag prevents infinite loops)
    //   b) this is the /auth/refresh call itself (refresh token is also expired)
    //   c) this is a login/register call (wrong credentials, not an expiry)
    // ─────────────────────────────────────────────────────────────────────────
    const isRefreshEndpoint = originalRequest.url?.includes('/auth/refresh');
    const isAuthEndpoint    = originalRequest.url?.includes('/auth/login') ||
                               originalRequest.url?.includes('/auth/register');

    if (originalRequest._retry || isRefreshEndpoint || isAuthEndpoint) {
      // The refresh token itself is invalid/expired, or creds are just wrong.
      // Clear session and redirect.
      forceLogout();
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }

    // Mark request as a retry so if it 401s again we don't loop
    originalRequest._retry = true;

    if (isRefreshing) {
      // A refresh is already in flight — queue this request and wait for
      // the new token to arrive via the promise below.
      return new Promise((resolve, reject) => {
        failedRequestsQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // ── Kick off the one token refresh ───────────────────────────────────────
    isRefreshing = true;

    try {
      // POST /api/auth/refresh — the HttpOnly cookie is sent automatically
      // because withCredentials: true is set on the axios instance.
      const { data } = await api.post('/auth/refresh');
      const newAccessToken = data.accessToken;

      // Persist the new short-lived token
      localStorage.setItem('protech_token', newAccessToken);

      // Flush the queue — all waiting requests get the new token
      flushQueue(null, newAccessToken);

      // Retry the original failed request with the new token
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed — session is truly dead
      flushQueue(refreshError, null);
      forceLogout();
      return Promise.reject(new Error('Session expired. Please log in again.'));
    } finally {
      isRefreshing = false;
    }
  }
);

// ── Named API Functions ───────────────────────────────────────────────────────
export const authAPI = {
  register:      (data)  => api.post('/auth/register', data),
  login:         (data)  => api.post('/auth/login', data),
  refresh:       ()      => api.post('/auth/refresh'),
  logout:        ()      => api.post('/auth/logout'),
  getProfile:    ()      => api.get('/auth/profile'),
  updateProfile: (data)  => api.put('/auth/profile', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data)  => api.post('/auth/reset-password', data),
};

export const propertyAPI = {
  getAll:  (params) => api.get('/property', { params }),
  create:  (data)   => api.post('/property', data),
  update:  (id, data) => api.put(`/property/${id}`, data),
  delete:  (id)     => api.delete(`/property/${id}`),
};

export const roomAPI = {
  getAll: (propertyId) => api.get(`/room/property/${propertyId}`),
  create: (data) => api.post('/room', data),
  update: (id, data) => api.put(`/room/${id}`, data),
  delete: (id) => api.delete(`/room/${id}`),
};

export const leaseAPI = {
  getAll:   (params)   => api.get('/lease/landlord/active', { params }),
  getMine:  (params)   => api.get('/lease/tenant/active',   { params }),
  create:   (data)     => api.post('/lease', data),
  getById:  (id)       => api.get(`/lease/${id}`),
  update:   (id, data) => api.put(`/lease/${id}`, data),
  terminate: (id)      => api.patch(`/lease/${id}/terminate`),
};

export const paymentAPI = {
  initiate:         (leaseId) => api.post('/payments/initiate', { lease_id: leaseId }),
  getHistory:       (params)  => api.get('/payments/history', { params }),
  getReceipt:       (ref)     => api.get(`/payments/receipt/${ref}`),
  createSubaccount: (data)    => api.post('/payments/subaccount', data),
  getBanks:         ()        => api.get('/payments/banks'),
};

export const approvalAPI = {
  request:     (data)     => api.post('/approval/request', data),
  getPending:  (params)   => api.get('/approval/pending', { params }),
  getApproved: (params)   => api.get('/approval/approved', { params }),
  process:     (id, data) => api.put(`/approval/${id}`, data),
};

export const announcementAPI = {
  getAll: (params) => api.get('/announcement', { params }),
  create: (data)   => api.post('/announcement', data),
  delete: (id)     => api.delete(`/announcement/${id}`),
};

export const adminAPI = {
  getStats:      ()       => api.get('/admin/stats'),
  getLandlords:  (params) => api.get('/admin/landlords',  { params }),
  getTenants:    (params) => api.get('/admin/tenants',    { params }),
  getPayments:   (params) => api.get('/admin/payments',   { params }),
  getProperties: (params) => api.get('/admin/properties', { params }),
};

export default api;
