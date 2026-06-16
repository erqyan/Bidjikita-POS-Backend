import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const MenuPage = lazy(() => import('@/pages/MenuPage'));
const IngredientsPage = lazy(() => import('@/pages/IngredientsPage'));
const BundlesPage = lazy(() => import('@/pages/BundlesPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const UsersPage = lazy(() => import('@/pages/UsersPage'));
const ShiftsPage = lazy(() => import('@/pages/ShiftsPage'));

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/ingredients" element={<IngredientsPage />} />
          <Route path="/recipes" element={<Navigate to="/menu" replace />} />
          <Route path="/bundles" element={<BundlesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />

          <Route path="/users" element={<UsersPage />} />
          <Route path="/shifts" element={<ShiftsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </Suspense>
  );
}
