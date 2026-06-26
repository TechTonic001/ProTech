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
  timeout: 25000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request automatically
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

// Handle responses and errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('protech_token');
      localStorage.removeItem('protech_user');
      // Prevent infinite redirect loops on public paths
      const publicPaths = ['/landlord/login', '/landlord/register', '/tenant/login', '/tenant/register', '/admin/login', '/forgot-password', '/verify-otp', '/reset-success', '/'];
      if (!publicPaths.includes(window.location.pathname)) {
        if (window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin/login';
        } else if (window.location.pathname.startsWith('/tenant')) {
          window.location.href = '/tenant/login';
        } else {
          window.location.href = '/landlord/login';
        }
      }
    }
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

// Named API Functions
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const propertyAPI = {
  getAll: () => api.get('/property'),
  create: (data) => api.post('/property', data),
  update: (id, data) => api.put(`/property/${id}`, data),
  delete: (id) => api.delete(`/property/${id}`),
};

export const roomAPI = {
  getAll: (propertyId) => api.get(`/room/property/${propertyId}`),
  create: (data) => api.post('/room', data),
  update: (id, data) => api.put(`/room/${id}`, data),
  delete: (id) => api.delete(`/room/${id}`),
};

export const leaseAPI = {
  getAll: () => api.get('/lease/landlord/active'),
  getMine: () => api.get('/lease/tenant/active'),
  create: (data) => api.post('/lease', data),
  getById: (id) => api.get(`/lease/${id}`),
  update: (id, data) => api.put(`/lease/${id}`, data),
  terminate: (id) => api.patch(`/lease/${id}/terminate`),
};

export const paymentAPI = {
  initiate: (leaseId) => api.post('/payments/initiate', { lease_id: leaseId }),
  getHistory: () => api.get('/payments/history'),
  getReceipt: (ref) => api.get(`/payments/receipt/${ref}`),
  createSubaccount: (data) => api.post('/payments/subaccount', data),
  getBanks: () => api.get('/payments/banks'),
};

export const approvalAPI = {
  request: (data) => api.post('/approval/request', data),
  getPending: () => api.get('/approval/pending'),
  getApproved: () => api.get('/approval/approved'),
  process: (id, data) => api.put(`/approval/${id}`, data),
};

export const announcementAPI = {
  getAll: () => api.get('/announcement'),
  create: (data) => api.post('/announcement', data),
  delete: (id) => api.delete(`/announcement/${id}`),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getLandlords: () => api.get('/admin/landlords'),
  getTenants: () => api.get('/admin/tenants'),
  getPayments: () => api.get('/admin/payments'),
  getProperties: () => api.get('/admin/properties'),
};

export default api;
