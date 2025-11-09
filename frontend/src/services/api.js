import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 - Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Try to refresh token
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
            headers: { Authorization: `Bearer ${refreshToken}` }
          });
          
          localStorage.setItem('access_token', data.access_token);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, logout
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    // Show error toast
    const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
    toast.error(errorMessage);

    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: () => api.post('/auth/refresh'),
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
};

// Products APIs
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  import: (data) => api.post('/products/import', data),
};

// AdBoost APIs
export const adsAPI = {
  launch: (data) => api.post('/ads/launch', data),
  getStatus: () => api.get('/ads/status'),
  getCampaign: (id) => api.get(`/ads/${id}`),
  pause: (id) => api.post(`/ads/${id}/pause`),
};

// Wallet APIs
export const walletAPI = {
  getBalance: () => api.get('/wallet'),
  buyCredits: (data) => api.post('/wallet/buy_credits', data),
  getTransactions: () => api.get('/wallet/transactions'),
};

// Withdrawal APIs
export const withdrawalAPI = {
  create: (data) => api.post('/withdraw', data),
  getMy: () => api.get('/withdrawals/my'),
  getAll: (params) => api.get('/admin/withdrawals', { params }),
  approve: (id, data) => api.post(`/admin/withdrawals/${id}/approve`, data),
  reject: (id, data) => api.post(`/admin/withdrawals/${id}/reject`, data),
};

// Admin APIs
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  getStats: () => api.get('/admin/stats'),
  addCommission: (data) => api.post('/admin/add_commission', data),
};

// Affiliate APIs
export const affiliateAPI = {
  getStats: (productId) => api.get(`/affiliate/stats/${productId}`),
};

export default api;
