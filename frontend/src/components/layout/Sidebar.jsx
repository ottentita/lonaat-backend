import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Megaphone, 
  DollarSign, 
  Wallet,
  CreditCard,
  Bell,
  User,
  Users,
  Settings,
  LogOut,
  Zap,
  TrendingUp,
  Home,
  Globe,
  Crown,
  ShieldAlert,
  Package2,
  Bot,
  MapPin,
  UserPlus,
  BarChart3,
  Gift,
  Car,
  Share2
} from 'lucide-react';
import { isAdmin } from '../../utils/auth';

const Sidebar = ({ onLogout }) => {
  const admin = isAdmin();

  const userLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboard/products', icon: Package, label: 'My Products' },
    { to: '/dashboard/networks', icon: Globe, label: 'Affiliate Networks' },
    { to: '/dashboard/offers-leads', icon: Gift, label: 'Offers & Leads' },
    { to: '/dashboard/social', icon: Share2, label: 'Social Automation' },
    { to: '/dashboard/real-estate', icon: Home, label: 'Real Estate' },
    { to: '/dashboard/automobiles', icon: Car, label: 'Automobiles' },
    { to: '/dashboard/land-registry', icon: MapPin, label: 'Land Registry' },
    { to: '/dashboard/property-leads', icon: UserPlus, label: 'Property Leads' },
    { to: '/dashboard/real-estate-analytics', icon: BarChart3, label: 'RE Analytics' },
    { to: '/dashboard/ads', icon: Megaphone, label: 'AdBoost' },
    { to: '/dashboard/wallet', icon: CreditCard, label: 'Wallet' },
    { to: '/dashboard/subscriptions', icon: Crown, label: 'Subscriptions' },
    { to: '/dashboard/commissions', icon: TrendingUp, label: 'Commissions' },
    { to: '/dashboard/transactions', icon: DollarSign, label: 'Transactions' },
    { to: '/dashboard/withdrawals', icon: Wallet, label: 'Withdrawals' },
    { to: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
    { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/products', icon: Package2, label: 'Products' },
    { to: '/admin/real-estate', icon: Home, label: 'Real Estate' },
    { to: '/admin/automobiles', icon: Car, label: 'Automobiles' },
    { to: '/admin/land-registry', icon: MapPin, label: 'Land Registry' },
    { to: '/admin/ads', icon: Megaphone, label: 'Ad Campaigns' },
    { to: '/admin/commissions', icon: TrendingUp, label: 'Commissions' },
    { to: '/admin/subscriptions', icon: Crown, label: 'Subscriptions' },
    { to: '/admin/withdrawals', icon: Wallet, label: 'Withdrawals' },
    { to: '/admin/payments', icon: DollarSign, label: 'Payments' },
    { to: '/admin/fraud', icon: ShieldAlert, label: 'Fraud Detection' },
    { to: '/admin/ai', icon: Bot, label: 'AI Control Center' },
    { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
  ];

  const links = admin ? adminLinks : userLinks;

  return (
    <div className="w-64 h-screen bg-dark-900 border-r border-dark-800 flex flex-col">
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

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/dashboard' || link.to === '/admin'}
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
