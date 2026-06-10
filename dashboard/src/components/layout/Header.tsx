import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, User } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import { getInitials } from '@/lib/utils';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/menu': 'Manajemen Menu',
  '/ingredients': 'Manajemen Bahan Baku',
  '/recipes': 'Manajemen Resep',
  '/bundles': 'Manajemen Bundling',
  '/orders': 'Riwayat Transaksi',
  '/analytics': 'Analitik & Laporan',
  '/shifts': 'Manajemen Shift',
  '/users': 'Manajemen Pengguna',
};

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const title = pageTitles[location.pathname] || 'Dashboard';
  const initials = user?.full_name ? getInitials(user.full_name) : (user?.username?.[0] || 'A').toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5" />
        </button>

        {/* User Dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-white text-xs font-semibold">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900 leading-none">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{user?.Role?.role_name || 'Admin'}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[180px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg p-1"
              sideOffset={8}
              align="end"
            >
              <div className="px-3 py-2 border-b border-gray-100 mb-1">
                <p className="text-sm font-medium text-gray-900">{user?.full_name || user?.username}</p>
                <p className="text-xs text-gray-500">@{user?.username}</p>
              </div>
              <DropdownMenu.Item className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer outline-none">
                <User className="h-4 w-4" />
                Profil
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="h-px bg-gray-100 my-1" />
              <DropdownMenu.Item
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
