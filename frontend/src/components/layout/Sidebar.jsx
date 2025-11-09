import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Megaphone, 
  DollarSign, 
  Wallet,
  User,
  Users,
  Settings,
  LogOut,
  Zap
} from 'lucide-react';
import { isAdmin } from '../../utils/auth';

const Sidebar = ({ onLogout }) => {
  const admin = isAdmin();

  const userLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/products', icon: Package, label: 'My Products' },
    { to: '/ads', icon: Megaphone, label: 'AdBoost' },
    { to: '/transactions', icon: DollarSign, label: 'Transactions' },
    { to: '/withdrawals', icon: Wallet, label: 'Withdrawals' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/ads', icon: Megaphone, label: 'Ad Campaigns' },
    { to: '/admin/withdrawals', icon: Wallet, label: 'Withdrawals' },
    { to: '/admin/payments', icon: DollarSign, label: 'Payments' },
  ];

  const links = admin ? adminLinks : userLinks;

  return (
    <div className="w-64 h-screen bg-dark-900 border-r border-dark-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-dark-800">
        <div className="flex items-center gap-2">
          <Zap className="w-8 h-8 text-primary-500" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            Lonaat
          </h1>
        </div>
        <p className="text-xs text-dark-400 mt-1">
          {admin ? 'Admin Panel' : 'Affiliate Marketing'}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link'
              }
            >
              <link.icon className="w-5 h-5" />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-dark-800">
        <button
          onClick={onLogout}
          className="sidebar-link w-full text-red-400 hover:bg-red-900/20"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
        <div className="mt-4 text-xs text-dark-500 text-center">
          Powered by Lonaat
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
