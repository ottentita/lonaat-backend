import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { isAuthenticated, isAdmin } from './utils/auth';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ResetPassword from './pages/auth/ResetPassword';
import UserDashboard from './pages/user/Dashboard';
import Products from './pages/user/Products';
import AdBoosts from './pages/user/AdBoosts';
import Wallet from './pages/user/Wallet';
import Transactions from './pages/user/Transactions';
import Withdrawals from './pages/user/Withdrawals';
import Commissions from './pages/user/Commissions';
import Notifications from './pages/user/Notifications';
import Profile from './pages/user/Profile';
import RealEstate from './pages/user/RealEstate';
import AffiliateNetworks from './pages/user/AffiliateNetworks';
import Subscriptions from './pages/user/Subscriptions';

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

// Legal Pages
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Contact from './pages/Contact';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

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

        <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/dashboard/ads" element={<ProtectedRoute><AdBoosts /></ProtectedRoute>} />
        <Route path="/dashboard/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
        <Route path="/dashboard/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
        <Route path="/dashboard/withdrawals" element={<ProtectedRoute><Withdrawals /></ProtectedRoute>} />
        <Route path="/dashboard/commissions" element={<ProtectedRoute><Commissions /></ProtectedRoute>} />
        <Route path="/dashboard/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/dashboard/settings" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/dashboard/real-estate" element={<ProtectedRoute><RealEstate /></ProtectedRoute>} />
        <Route path="/dashboard/networks" element={<ProtectedRoute><AffiliateNetworks /></ProtectedRoute>} />
        <Route path="/dashboard/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
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
