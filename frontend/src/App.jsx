import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { isAuthenticated, isAdmin } from './utils/auth';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ResetPassword from './pages/auth/ResetPassword';
import Products from './pages/user/Products';
import AdBoosts from './pages/user/AdBoosts';
import Wallet from './pages/user/Wallet';
import Transactions from './pages/user/Transactions';
import Withdrawals from './pages/user/Withdrawals';
import Commissions from './pages/user/Commissions';
import Notifications from './pages/user/Notifications';
import Profile from './pages/user/Profile';
import SettingsPage from './pages/user/Settings';
import RealEstate from './pages/user/RealEstate';
import RealEstateLayout from './modules/real-estate/RealEstateLayout';
import LandRegistry from './pages/user/LandRegistry';
import PropertyLeads from './pages/user/PropertyLeads';
import RealEstateAnalytics from './pages/user/RealEstateAnalytics';
import AffiliateNetworks from './pages/user/AffiliateNetworks';
import Subscriptions from './pages/user/Subscriptions';
import OffersLeads from './pages/user/OffersLeads';
import Automobiles from './pages/user/Automobiles';
import SocialAutomation from './pages/user/SocialAutomation';
import Marketplace from './pages/Marketplace';
import CategoryPage from './pages/Category';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminAds from './pages/admin/Ads';
import AdminWithdrawals from './pages/admin/Withdrawals';
import AdminPayments from './pages/admin/Payments';
import AdminNotifications from './pages/admin/Notifications';
import AdminRealEstate from './pages/admin/RealEstate';
import AdminProducts from './pages/admin/Products';
import AdminSubscriptions from './pages/admin/Subscriptions';
import FraudDetection from './pages/admin/FraudDetection';
import AIControlCenter from './pages/admin/AIControlCenter';
import AdminCommissions from './pages/admin/Commissions';
import AdminLandRegistry from './pages/admin/LandRegistry';
import AdminAutomobiles from './pages/admin/Automobiles';

// Legal Pages
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Contact from './pages/Contact';

// New dashboard layout & pages
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardHome from './pages/DashboardHome';
import OffersPage from './pages/OffersPage';
import LeadsPage from './pages/LeadsPage';
import EarningsPage from './pages/EarningsPage';
import DashboardSettings from './pages/SettingsPage';

// Note: `ProtectedRoute` moved to components/ProtectedRoute.jsx

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#f1f5f9',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f1f5f9',
            },
          },
        }}
      />

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DashboardHome />} />
          <Route path="products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="ads" element={<ProtectedRoute><AdBoosts /></ProtectedRoute>} />
          <Route path="wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route path="transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          <Route path="withdrawals" element={<ProtectedRoute><Withdrawals /></ProtectedRoute>} />
          <Route path="commissions" element={<ProtectedRoute><Commissions /></ProtectedRoute>} />
          <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="user-settings" element={<ProtectedRoute><DashboardSettings /></ProtectedRoute>} />
          <Route path="real-estate" element={<ProtectedRoute><RealEstateLayout /></ProtectedRoute>} />
          <Route path="land-registry" element={<ProtectedRoute><LandRegistry /></ProtectedRoute>} />
          <Route path="property-leads" element={<ProtectedRoute><PropertyLeads /></ProtectedRoute>} />
          <Route path="real-estate-analytics" element={<ProtectedRoute><RealEstateAnalytics /></ProtectedRoute>} />
          <Route path="networks" element={<ProtectedRoute><AffiliateNetworks /></ProtectedRoute>} />
          <Route path="offers-leads" element={<ProtectedRoute><OffersLeads /></ProtectedRoute>} />
          <Route path="subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
          <Route path="automobiles" element={<ProtectedRoute><Automobiles /></ProtectedRoute>} />
          <Route path="social" element={<ProtectedRoute><SocialAutomation /></ProtectedRoute>} />
          <Route path="offers" element={<ProtectedRoute><OffersPage /></ProtectedRoute>} />
          <Route path="leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
          <Route path="earnings" element={<ProtectedRoute><EarningsPage /></ProtectedRoute>} />
        </Route>

        <Route path="/admin/dashboard" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/ads" element={<ProtectedRoute adminOnly><AdminAds /></ProtectedRoute>} />
        <Route path="/admin/withdrawals" element={<ProtectedRoute adminOnly><AdminWithdrawals /></ProtectedRoute>} />
        <Route path="/admin/payments" element={<ProtectedRoute adminOnly><AdminPayments /></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute adminOnly><AdminNotifications /></ProtectedRoute>} />
        <Route path="/admin/real-estate" element={<ProtectedRoute adminOnly><AdminRealEstate /></ProtectedRoute>} />
        <Route path="/admin/products" element={<ProtectedRoute adminOnly><AdminProducts /></ProtectedRoute>} />
        <Route path="/admin/subscriptions" element={<ProtectedRoute adminOnly><AdminSubscriptions /></ProtectedRoute>} />
        <Route path="/admin/fraud" element={<ProtectedRoute adminOnly><FraudDetection /></ProtectedRoute>} />
        <Route path="/admin/ai" element={<ProtectedRoute adminOnly><AIControlCenter /></ProtectedRoute>} />
        <Route path="/admin/commissions" element={<ProtectedRoute adminOnly><AdminCommissions /></ProtectedRoute>} />
        <Route path="/admin/land-registry" element={<ProtectedRoute adminOnly><AdminLandRegistry /></ProtectedRoute>} />
        <Route path="/admin/automobiles" element={<ProtectedRoute adminOnly><AdminAutomobiles /></ProtectedRoute>} />

        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/marketplace/:slug" element={<CategoryPage />} />

        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />

        <Route
          path="/"
          element={
            isAuthenticated() ? (
              isAdmin() ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
