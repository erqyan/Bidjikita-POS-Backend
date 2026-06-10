import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import MenuPage from '@/pages/MenuPage';
import IngredientsPage from '@/pages/IngredientsPage';
import RecipesPage from '@/pages/RecipesPage';
import BundlesPage from '@/pages/BundlesPage';
import OrdersPage from '@/pages/OrdersPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import ShiftsPage from '@/pages/ShiftsPage';
import UsersPage from '@/pages/UsersPage';

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/ingredients" element={<IngredientsPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/bundles" element={<BundlesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/shifts" element={<ShiftsPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
