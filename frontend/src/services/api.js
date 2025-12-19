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
          if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token);
          }
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens but don't redirect if on public pages
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          
          const publicPaths = ['/login', '/register', '/', '/about'];
          if (!publicPaths.includes(window.location.pathname)) {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token - only redirect if on protected routes
        const publicPaths = ['/login', '/register', '/', '/about'];
        if (!publicPaths.includes(window.location.pathname)) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }

    // Show error toast (but not for 401s to avoid spam during refresh)
    if (error.response?.status !== 401) {
      const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

// Auth APIs - Production Ready
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: () => api.post('/auth/refresh'),
  getMe: () => api.get('/auth/me'),
  sendVerification: () => api.post('/auth/send-verification'),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  requestPasswordReset: (email) => api.post('/auth/request-password-reset', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
};

// Affiliate Offers APIs - Digistore24 & Awin Only
export const offersAPI = {
  getOffers: (network, query = '', page = 1) => api.get('/offers', { params: { network, q: query, page } }),
  getOfferDetail: (id) => api.get(`/offers/${id}`),
  importOffer: (data) => api.post('/offers/import', data), // { offer_id, network, earn_mode }
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

// Commissions APIs
export const commissionsAPI = {
  getMy: (params) => api.get('/commissions', { params }),
  getSummary: () => api.get('/commissions/summary'),
  getAll: (params) => api.get('/admin/commissions', { params }),
  approve: (id) => api.post(`/admin/commissions/${id}/approve`),
  reject: (id, data) => api.post(`/admin/commissions/${id}/reject`, data),
  markPaid: (id) => api.post(`/admin/commissions/${id}/mark-paid`),
};

// AdBoost APIs
export const adsAPI = {
  launch: (data) => api.post('/ads/launch', data),
  getStatus: () => api.get('/ads/status'),
  getCampaign: (id) => api.get(`/ads/${id}`),
  pause: (id) => api.post(`/ads/${id}/pause`),
  resume: (id) => api.post(`/ads/${id}/resume`),
  stop: (id) => api.post(`/ads/${id}/stop`),
};

// Wallet APIs
export const walletAPI = {
  getBalance: () => api.get('/wallet'),
  buyCredits: (data) => api.post('/wallet/buy_credits', data),
  getTransactions: () => api.get('/wallet/transactions'),
};

// Withdrawal APIs
export const withdrawalAPI = {
  create: (data) => api.post('/wallet/withdraw', data),
  getMy: () => api.get('/wallet/withdrawals'),
  getBalance: () => api.get('/wallet/balance'),
  getAll: (params) => api.get('/admin/withdrawals', { params }),
  approve: (id, data) => api.put(`/admin/withdrawals/${id}/approve`, data),
  reject: (id, data) => api.put(`/admin/withdrawals/${id}/reject`, data),
};

// Notifications (email-based, no API endpoints)
export const notificationsAPI = {
  // Note: Notifications are sent via email service automatically
  // No direct API endpoints for notifications - they're triggered by events:
  // - Registration → Welcome email
  // - Email verification → Verification link
  // - Withdrawal request → Confirmation email
  // - Commission approved → Notification email
};

// Admin APIs
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    
    const data = response.data;
    const stats = data.statistics || {};
    
    return {
      ...response,
      data: {
        stats: {
          total_users: stats.users?.total || 0,
          active_users: stats.users?.active || 0,
          total_revenue: stats.commissions?.total_amount || stats.transactions?.total_commissions || 0,
          pending_withdrawals: stats.transactions?.pending_withdrawals_count || 0,
          total_withdrawals: stats.transactions?.total_withdrawals || 0,
          total_campaigns: stats.ad_boosts?.total || 0,
          total_products: stats.products?.total || 0,
        },
        raw: data
      }
    };
  },
  getStats: async () => {
    return adminAPI.getDashboard();
  },
  addCommission: (data) => api.post('/admin/add_commission', data),
  
  // AI Bulk Operations (Admin only - free unlimited)
  aiBulkImport: (data) => api.post('/admin/ai/bulk-import', data),
  aiGenerateAds: (data) => api.post('/admin/ai/generate-ads', data),
  
  // Fraud Management
  getFraudStats: () => api.get('/admin/fraud/flagged-users'),
  blockUser: (userId, data) => api.post(`/admin/fraud/block/${userId}`, data),
  unblockUser: (userId) => api.post(`/admin/fraud/unblock/${userId}`),
  deactivateUser: (userId) => api.post(`/admin/users/${userId}/deactivate`),
  reactivateUser: (userId) => api.post(`/admin/users/${userId}/reactivate`),
};

// Admin AI Control Center APIs
export const adminAIAPI = {
  runAdsForProducts: (productIds) => api.post('/admin/ai/run-ads/products', { product_ids: productIds }),
  runAdsForRealEstate: (propertyIds) => api.post('/admin/ai/run-ads/real-estate', { property_ids: propertyIds }),
  runAdsForAll: () => api.post('/admin/ai/run-ads/all'),
  scanCommissions: (networks) => api.post('/admin/ai/run-commission-scan', { networks }),
  stopAllTasks: () => api.post('/admin/ai/stop-all'),
  getLogs: (params) => api.get('/admin/ai/logs', { params }),
  getStats: () => api.get('/admin/ai/stats'),
  getStatus: () => api.get('/admin/ai/status'),
};

// Affiliate APIs
export const affiliateAPI = {
  getStats: (productId) => api.get(`/affiliate/stats/${productId}`),
};

// Real Estate APIs
export const realEstateAPI = {
  getMarketplace: (params) => api.get('/properties/marketplace', { params }),
  getMyProperties: (params) => api.get('/properties/my', { params }),
  getProperty: (id) => api.get(`/properties/listing/${id}`),
  createProperty: (data) => api.post('/properties/create', data),
  updateProperty: (id, data) => api.put(`/properties/update/${id}`, data),
  deleteProperty: (id) => api.delete(`/properties/${id}`),
  boostProperty: (id) => api.post(`/properties/${id}/boost`),
  payListingFee: (id, formData) => api.post(`/properties/${id}/pay`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getListingFees: () => api.get('/properties/fees'),
  getPropertyStats: () => api.get('/properties/my').then(res => ({
    data: {
      total_properties: res.data.properties?.length || 0,
      approved: res.data.properties?.filter(p => p.status === 'approved').length || 0,
      pending_approval: res.data.properties?.filter(p => p.status === 'pending').length || 0,
      can_add_property: true,
      max_allowed: 'unlimited',
      current_count: res.data.properties?.length || 0
    }
  })),
  getPropertyTypes: () => Promise.resolve({
    data: {
      types: ['house', 'land', 'apartment', 'commercial', 'rental', 'guest_house'],
      transaction_types: ['sale', 'rent', 'lease'],
      cities: ['Douala', 'Yaounde', 'Bafoussam', 'Bamenda', 'Garoua', 'Maroua', 'Ngaoundere', 'Bertoua', 'Ebolowa', 'Kribi'],
      regions: ['Littoral', 'Centre', 'West', 'Northwest', 'North', 'Far North', 'Adamawa', 'East', 'South', 'Southwest']
    }
  }),
  getMyBookings: () => Promise.resolve({ data: { bookings: [] } }),
  
  adminGetProperties: (params) => api.get('/admin/properties', { params }),
  adminApproveProperty: (id, data) => api.post(`/admin/properties/${id}/approve`, data),
  adminRejectProperty: (id, data) => api.post(`/admin/properties/${id}/reject`, data),
  adminCreateProperty: (data) => api.post('/admin/properties', data),
  adminGetPayments: (params) => api.get('/admin/property-payments', { params }),
  adminApprovePayment: (id) => api.put(`/admin/property-payments/${id}/approve`),
  adminRejectPayment: (id, data) => api.put(`/admin/property-payments/${id}/reject`, data),
};

export default api;
