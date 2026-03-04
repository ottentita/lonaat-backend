import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
// Note: router context provided in main.jsx

// Pages (eager for core auth/utility)
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Products from './pages/user/Products';
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
import AffiliateNetworks from './pages/user/AffiliateNetworks';
import Subscriptions from './pages/user/Subscriptions';
import OffersLeads from './pages/user/OffersLeads';
import SocialAutomation from './pages/user/SocialAutomation';
import Marketplace from './pages/Marketplace';
import CategoryPage from './pages/Category';

// Lazy-loaded pages (heavier, pulled only when requested)
const Automobiles = lazy(() => import('./pages/user/Automobiles'));
const RealEstateAnalytics = lazy(() => import('./pages/user/RealEstateAnalytics'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminAds = lazy(() => import('./pages/admin/Ads'));
const AdminWithdrawals = lazy(() => import('./pages/admin/Withdrawals'));
const AdminPayments = lazy(() => import('./pages/admin/Payments'));
const AdminNotifications = lazy(() => import('./pages/admin/Notifications'));
const AdminRealEstate = lazy(() => import('./pages/admin/RealEstate'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminSubscriptions = lazy(() => import('./pages/admin/Subscriptions'));
const FraudDetection = lazy(() => import('./pages/admin/FraudDetection'));
const AIControlCenter = lazy(() => import('./pages/admin/AIControlCenter'));
const AdminCommissions = lazy(() => import('./pages/admin/Commissions'));
const AdminLandRegistry = lazy(() => import('./pages/admin/LandRegistry'));
const AdminAutomobiles = lazy(() => import('./pages/admin/Automobiles'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));

// Legal Pages
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Contact from './pages/Contact';
import TestPayment from './pages/TestPayment';

// New dashboard layout & pages
import DashboardLayout from './components/layout/DashboardLayout';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Services from './pages/Services';
import Users from './pages/Users';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import DashboardHome from './pages/DashboardHome';
import OffersPage from './pages/OffersPage';
import LeadsPage from './pages/LeadsPage';
import EarningsPage from './pages/EarningsPage';
import DashboardSettings from './pages/SettingsPage';

// Note: `ProtectedRoute` moved to components/ProtectedRoute.jsx

function App() {
  return (
    <>
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

      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* User Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="products" element={<Products />} />
            <Route path="real-estate" element={<RealEstate />} />
            <Route path="automobiles" element={<Automobiles />} />
            <Route path="services" element={<Services />} />
            <Route path="users" element={<Users />} />
            <Route path="payments" element={<Payments />} />
            <Route path="reports" element={<Reports />} />

            <Route path="wallet" element={<Wallet />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="withdrawals" element={<Withdrawals />} />
            <Route path="commissions" element={<Commissions />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="offers" element={<OffersPage />} />
            <Route path="offers-leads" element={<OffersLeads />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="earnings" element={<EarningsPage />} />
            <Route path="settings" element={<DashboardSettings />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="withdrawals" element={<AdminWithdrawals />} />
            <Route path="commissions" element={<AdminCommissions />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="ads" element={<AdminAds />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="real-estate" element={<AdminRealEstate />} />
            <Route path="automobiles" element={<AdminAutomobiles />} />
            <Route path="land-registry" element={<AdminLandRegistry />} />
            <Route path="fraud-detection" element={<FraudDetection />} />
            <Route path="ai-control" element={<AIControlCenter />} />
          </Route>
        </Route>
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
