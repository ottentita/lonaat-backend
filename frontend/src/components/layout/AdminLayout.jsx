import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Users, DollarSign, TrendingUp, LogOut, Menu, X } from 'lucide-react';
import { clearAuth } from '@/utils/auth';
import toast from 'react-hot-toast';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const adminNavItems = [
    { path: '/admin', label: 'Dashboard', icon: BarChart3 },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/withdrawals', label: 'Withdrawals', icon: DollarSign },
    { path: '/admin/commissions', label: 'Commissions', icon: BarChart3 },
    { path: '/admin/analytics', label: 'Analytics', icon: TrendingUp }
  ];

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-dark-900 text-dark-50">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-dark-700 rounded-lg"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-primary-500" />
              <span className="text-xl font-bold">LONAAT Admin</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-dark-800 border-r border-dark-700 transition-all duration-300 overflow-hidden lg:flex lg:flex-col`}>
          <nav className="flex-1 p-4 space-y-2">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-500 text-dark-900 font-semibold'
                      : 'text-dark-300 hover:bg-dark-700'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
