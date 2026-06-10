import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  TrendingUp, ShoppingCart, Package, AlertTriangle,
} from 'lucide-react';
import { getAnalyticsSummary, getRevenueTrend, getTopProducts } from '@/api/analytics';
import { getTransactions } from '@/api/transactions';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const COLORS = ['#d97706', '#3b82f6', '#10b981', '#8b5cf6'];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data: summary, isPending: loadingSummary } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => getAnalyticsSummary().then((r) => r.data),
  });

  const { data: trend, isPending: loadingTrend } = useQuery({
    queryKey: ['revenue-trend', '7d'],
    queryFn: () => getRevenueTrend('7d').then((r) => r.data),
  });

  const { data: topProducts, isPending: loadingTop } = useQuery({
    queryKey: ['top-products', 5],
    queryFn: () => getTopProducts(5).then((r) => r.data),
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions().then((r) => r.data),
  });

  const recentTransactions = transactions?.slice(0, 5) ?? [];

  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Selamat Datang, {user?.full_name?.split(' ')[0] || user?.username}! 👋
        </h2>
        <p className="text-gray-500 text-sm mt-1">{today}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Pendapatan Hari Ini"
          value={formatCurrency(summary?.today_revenue ?? 0)}
          icon={<TrendingUp className="h-6 w-6" />}
          color="amber"
          loading={loadingSummary}
        />
        <StatCard
          title="Order Hari Ini"
          value={summary?.today_orders ?? 0}
          icon={<ShoppingCart className="h-6 w-6" />}
          color="blue"
          loading={loadingSummary}
        />
        <StatCard
          title="Total Produk Aktif"
          value={summary?.total_products ?? 0}
          icon={<Package className="h-6 w-6" />}
          color="green"
          loading={loadingSummary}
        />
        <StatCard
          title="Stok Hampir Habis"
          value={summary?.low_stock_count ?? 0}
          icon={<AlertTriangle className="h-6 w-6" />}
          color="red"
          subtitle="Klik untuk lihat detail"
          loading={loadingSummary}
          onClick={() => navigate('/ingredients')}
        />
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Pendapatan 7 Hari Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTrend ? (
            <PageLoader />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Pendapatan']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('id-ID', { weekday: 'long', month: 'long', day: 'numeric' })}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#d97706"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Produk Terlaris</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTop ? (
              <PageLoader />
            ) : topProducts && topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis
                    dataKey="product_name"
                    type="category"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={110}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value} porsi`, 'Terjual']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }}
                  />
                  <Bar dataKey="total_quantity" radius={[0, 6, 6, 0]}>
                    {topProducts.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                Belum ada data penjualan
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transaksi Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {recentTransactions.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm px-6">
                Belum ada transaksi
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{tx.invoice_number}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(tx.transaction_date)}</p>
                    </div>
                    <div className="ml-4 flex items-center gap-3 shrink-0">
                      <Badge
                        variant={
                          tx.payment_status === 'paid' ? 'success' :
                          tx.payment_status === 'pending' ? 'warning' : 'danger'
                        }
                      >
                        {tx.payment_status === 'paid' ? 'Lunas' : tx.payment_status === 'pending' ? 'Pending' : 'Gagal'}
                      </Badge>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(tx.total_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
