import axios from 'axios';
import toast from 'react-hot-toast';
import logger from '../middleware/logger';
import envConfig from '../utils/envConfig';

// Prefer explicit VITE_API_URL, fall back to localhost backend for development
const envBase = import.meta.env.VITE_API_URL || '';
const base = envBase || 'http://localhost:4000';
const API_BASE_URL = `${base.replace(/\/$/, '')}/api`;

logger.setContext('service', 'api');
logger.setContext('apiUrl', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // send cookies automatically
});

// Request interceptor for logging (token not used)
api.interceptors.request.use(
  (config) => {
    const startTime = Date.now();
    // Attach metadata for response interceptor
    config._metadata = { startTime };

    // Log API call in development
    if (envConfig.isDevelopment()) {
      logger.debug(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    logger.error('Request error', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
api.interceptors.response.use(
  (response) => {
    const duration = Date.now() - (response.config._metadata?.startTime || 0);
    
    // Log successful API calls
    logger.trackApiCall(
      response.config.method.toUpperCase(),
      response.config.url,
      response.status,
      duration
    );

    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const duration = Date.now() - (originalRequest._metadata?.startTime || 0);
    
    // Log API error
    logger.trackApiCall(
      originalRequest.method.toUpperCase(),
      originalRequest.url,
      error.response?.status || 0,
      duration,
      error
    );

    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      // With cookie-based auth, server manages session. Clear client-side user and redirect.
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // Show error toast (but not for 401s to avoid spam)
    if (error.response?.status !== 401) {
      const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
      toast.error(errorMessage);
      logger.error('API Error', error, {
        endpoint: originalRequest.url,
        status: error.response?.status,
        message: errorMessage
      });
    }

    return Promise.reject(error);
  }
);

// no extra safety interceptor needed; cookie auth is handled server-side
api.interceptors.response.use(
  response => response,
  (error) => {
    // propagate all errors through the main response interceptor
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

// User settings APIs
export const settingsAPI = {
  get: () => api.get('/user/settings'),
  update: (data) => api.put('/user/settings', data),
  changePassword: (currentPassword, newPassword) => api.put('/user/password', { currentPassword, newPassword })
}

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
  getUsage: () => api.get('/products/usage'),
};

export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getListingsBySlug: (slug, params) => api.get(`/categories/${slug}/listings`, { params })
}

export const listingsAPI = {
  getAll: (params) => api.get('/listings', { params }),
  getSeller: () => api.get('/listings/seller'),
  create: (data) => api.post('/listings', data),
  update: (id, data) => api.put(`/listings/${id}`, data),
  remove: (id) => api.delete(`/listings/${id}`)
}

export const marketAPI = {
  // Marketplace product categories and public listings
  getCategories: () => api.get('/marketplace/categories'),
  getListings: (params) => api.get('/marketplace/products', { params })
}

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
  getBalance: async () => {
    const resp = await api.get('/wallet');
    // normalize numeric balance for UI consumers (Prisma Decimal serializes as string)
    if (resp?.data?.wallet?.balance !== undefined) {
      const parsed = Number(resp.data.wallet.balance);
      resp.data.wallet.balance = Number.isNaN(parsed) ? resp.data.wallet.balance : parsed;
      // keep a top-level `balance` for callers that expect it (backwards-compat)
      resp.data.balance = resp.data.wallet.balance;
    }
    return resp;
  },
  // UI-friendly alias — prefer explicit summary endpoint
  getSummary: async () => {
    const resp = await api.get('/wallet/summary');
    if (resp?.data?.wallet?.balance !== undefined) {
      const parsed = Number(resp.data.wallet.balance);
      resp.data.wallet.balance = Number.isNaN(parsed) ? resp.data.wallet.balance : parsed;
    }
    return resp;
  },
  getWallet: async () => {
    const resp = await api.get('/wallet');
    if (resp?.data?.wallet?.balance !== undefined) {
      const parsed = Number(resp.data.wallet.balance);
      resp.data.wallet.balance = Number.isNaN(parsed) ? resp.data.wallet.balance : parsed;
      resp.data.balance = resp.data.wallet.balance;
    }
    return resp;
  },
  buyCredits: (data) => api.post('/wallet/buy_credits', data),
  getTransactions: () => api.get('/wallet/transactions'),
  getBankAccount: () => api.get('/wallet/bank-account'),
  saveBankAccount: (data) => api.post('/wallet/bank-account', data),
  getMyWithdrawals: () => api.get('/wallet/withdrawals'),
  requestWithdrawal: (data) => api.post('/wallet/withdraw', data),
};

// Withdrawal APIs
export const withdrawalAPI = {
  create: (data) => api.post('/wallet/withdraw', data),
  quickWithdraw: (data) => api.post('/wallet/withdraw/quick', data),
  getMy: () => api.get('/wallet/withdrawals'),
  getBalance: () => api.get('/wallet/balance'),
  getAll: (params) => api.get('/admin/withdrawals', { params }),
  approve: (id, data) => api.put(`/admin/withdrawals/${id}/approve`, data),
  reject: (id, data) => api.put(`/admin/withdrawals/${id}/reject`, data),
  markPaid: (id, data) => api.put(`/admin/withdrawals/${id}/mark-paid`, data),
  getBankDetails: (id) => api.get(`/admin/withdrawals/${id}/bank-details`),
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
    const stats = data.stats || data.statistics || {};
    
    return {
      ...response,
      data: {
        stats: {
          total_users: stats.total_users || stats.users?.total || 0,
          active_users: stats.active_users || stats.users?.active || 0,
          total_revenue: stats.total_volume || stats.commissions?.total_amount || 0,
          pending_withdrawals: stats.pending_withdrawals || 0,
          total_withdrawals: stats.total_withdrawals || 0,
          total_campaigns: stats.active_campaigns || stats.ad_boosts?.total || 0,
          total_products: stats.total_products || stats.products?.total || 0,
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
  getStats: () => api.get('/affiliate/stats'),
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
  getTypesInfo: () => api.get('/properties/types-info'),
  uploadImages: (formData) => api.post('/properties/upload/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadVideo: (formData) => api.post('/properties/upload/videos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadDocuments: (formData) => api.post('/properties/upload/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
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
  getMyBookings: () => Promise.resolve({ data: { bookings: [] } }),
  
  adminGetProperties: (params) => api.get('/admin/properties', { params }),
  adminApproveProperty: (id, data) => api.post(`/admin/properties/${id}/approve`, data),
  adminRejectProperty: (id, data) => api.post(`/admin/properties/${id}/reject`, data),
  adminCreateProperty: (data) => api.post('/admin/properties', data),
  adminGetPayments: (params) => api.get('/admin/property-payments', { params }),
  adminApprovePayment: (id) => api.put(`/admin/property-payments/${id}/approve`),
  adminRejectPayment: (id, data) => api.put(`/admin/property-payments/${id}/reject`, data),
};

export const landRegistryAPI = {
  getLands: (params) => api.get('/land-registry', { params }),
  getLand: (id) => api.get(`/land-registry/${id}`),
  verifyBoundaries: (polygon_coords, exclude_land_id) => api.post('/land-registry/verify', { polygon_coords, exclude_land_id }),
  registerLand: (data) => api.post('/land-registry/register', data),
  searchLands: (params) => api.get('/land-registry/search', { params }),
  getLandAtPoint: (lat, lng) => api.get('/land-registry/point', { params: { lat, lng } }),
  getHistory: (id) => api.get(`/land-registry/${id}/history`),
  verifyLand: (id, data) => api.put(`/land-registry/${id}/verify`, data),
  transferOwnership: (id, data) => api.post(`/land-registry/${id}/transfer`, data),
  getStats: () => api.get('/land-registry/stats/overview'),
  getMapData: () => api.get('/land-registry/map'),
  searchByLocation: (lat, lng, radiusKm = 5) => api.get('/land-registry/nearby', { params: { lat, lng, radius: radiusKm } }),
  getNeighbors: (id) => api.get(`/land-registry/${id}/neighbors`),
};

export const leadsAPI = {
  getLeads: (params) => api.get('/leads', { params }),
  getLead: (id) => api.get(`/leads/${id}`),
  createLead: (data) => api.post('/leads', data),
  updateStatus: (id, data) => api.put(`/leads/${id}/status`, data),
  updatePriority: (id, priority) => api.put(`/leads/${id}/priority`, { priority }),
  deleteLead: (id) => api.delete(`/leads/${id}`),
  getStats: () => api.get('/leads/stats'),
};

export const realEstateAnalyticsAPI = {
  getOverview: () => api.get('/real-estate/analytics/overview'),
  getRevenue: (period) => api.get('/real-estate/analytics/revenue', { params: { period } }),
  getPerformance: () => api.get('/real-estate/analytics/performance'),
  getLandAnalytics: () => api.get('/real-estate/analytics/land'),
  getLeadAnalytics: (period) => api.get('/real-estate/analytics/leads', { params: { period } }),
};

export const socialAPI = {
  getAccounts: () => api.get('/social/accounts'),
  addAccount: (data) => api.post('/social/accounts', data),
  deleteAccount: (id) => api.delete(`/social/accounts/${id}`),
  toggleAccount: (id) => api.patch(`/social/accounts/${id}/toggle`),
  getPosts: (params) => api.get('/social/posts', { params }),
  generatePosts: (productId) => api.post('/social/posts/generate', { product_id: productId }),
  previewContent: (productId) => api.post('/social/posts/preview', { product_id: productId }),
  publishPost: (id) => api.post(`/social/posts/${id}/publish`),
  deletePost: (id) => api.delete(`/social/posts/${id}`),
  retryFailed: () => api.post('/social/posts/retry-failed'),
  getStats: () => api.get('/social/stats'),
};

// Analytics API (platform-wide)
export const analyticsAPI = {
  // backend route should provide aggregated platform metrics
  getPlatformAnalytics: () => api.get('/admin/analytics/platform'),
};

// Automobiles feature API helpers
export const automobilesAPI = {
  getMine: () => api.get('/automobiles/mine'),
  getStats: () => api.get('/automobiles/stats'),
  list: (params) => api.get('/automobiles', { params }),
  create: (data) => api.post('/automobiles', data),
  updateStatus: (id, status) => api.put(`/automobiles/${id}/status`, { status }),
  delete: (id) => api.delete(`/automobiles/${id}`),
};

export default api;

// Export internal axios instance for unit tests and small integrations
export { api };
