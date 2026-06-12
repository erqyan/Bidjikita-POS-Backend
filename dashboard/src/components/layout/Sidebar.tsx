import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  FlaskConical,
  Package,
  ShoppingCart,
  BarChart3,

  Users,
  LogOut,
  Coffee,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/ingredients', label: 'Bahan Baku', icon: FlaskConical },
  { to: '/bundles', label: 'Bundling', icon: Package },
  { to: '/orders', label: 'Transaksi', icon: ShoppingCart },
  { to: '/analytics', label: 'Analitik', icon: BarChart3 },

  { to: '/users', label: 'Pengguna', icon: Users },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900 flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500">
            <Coffee className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-amber-400 font-bold text-base leading-none">Bidjikita</p>
            <p className="text-slate-400 text-xs mt-0.5">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-slate-700/50">
        <div className="mb-3 px-3">
          <p className="text-slate-200 text-sm font-medium truncate">{user?.full_name || user?.username}</p>
          <p className="text-slate-500 text-xs truncate">{user?.Role?.role_name || 'Admin'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-600/20 hover:text-red-400 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
