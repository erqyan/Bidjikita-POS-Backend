import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, ShoppingCart, Package, AlertTriangle, DollarSign, Calendar } from 'lucide-react';
import {
  getAnalyticsSummary, getRevenueTrend, getTopProducts,
  getPaymentMethodStats, getShiftPerformance,
} from '@/api/analytics';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Spinner';
import { formatCurrency, formatNumber } from '@/lib/utils';

type Period = '7d' | '30d' | '90d';

const PIE_COLORS: Record<string, string> = {
  cash: '#d97706',
  qris: '#3b82f6',
  debit: '#10b981',
  credit: '#8b5cf6',
};

const methodLabel: Record<string, string> = { cash: 'Tunai', qris: 'QRIS', debit: 'Debit', credit: 'Kredit' };

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('7d');

  const { data: summary, isPending: loadSum } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => getAnalyticsSummary().then((r) => r.data),
  });

  const { data: trend, isPending: loadTrend } = useQuery({
    queryKey: ['revenue-trend', period],
    queryFn: () => getRevenueTrend(period).then((r) => r.data),
  });

  const { data: topProducts, isPending: loadTop } = useQuery({
    queryKey: ['top-products', 10],
    queryFn: () => getTopProducts(10).then((r) => r.data),
  });

  const { data: paymentStats, isPending: loadPay } = useQuery({
    queryKey: ['payment-methods', period],
    queryFn: () => getPaymentMethodStats(period).then((r) => r.data),
  });

  const { data: shiftPerf, isPending: loadShift } = useQuery({
    queryKey: ['shift-performance', period],
    queryFn: () => getShiftPerformance(period).then((r) => r.data),
  });

  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  const pieData = (paymentStats || []).map((s) => ({
    name: methodLabel[s.payment_method] || s.payment_method,
    value: Number(s.total),
    count: Number(s.count),
    key: s.payment_method,
  }));

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Periode:</span>
        {(['7d', '30d', '90d'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${period === p ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {p === '7d' ? '7 Hari' : p === '30d' ? '30 Hari' : '90 Hari'}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard title="Pendapatan Hari Ini" value={formatCurrency(summary?.today_revenue ?? 0)} icon={<TrendingUp className="h-6 w-6" />} color="amber" loading={loadSum} />
        <StatCard title="Order Hari Ini" value={summary?.today_orders ?? 0} icon={<ShoppingCart className="h-6 w-6" />} color="blue" loading={loadSum} />
        <StatCard title={`Pendapatan ${periodDays} Hari`} value={formatCurrency(period === '7d' ? (summary?.weekly_revenue ?? 0) : (summary?.monthly_revenue ?? 0))} icon={<DollarSign className="h-6 w-6" />} color="green" loading={loadSum} />
        <StatCard title="Pendapatan Bulan Ini" value={formatCurrency(summary?.monthly_revenue ?? 0)} icon={<Calendar className="h-6 w-6" />} color="purple" loading={loadSum} />
        <StatCard title="Total Produk Aktif" value={summary?.total_products ?? 0} icon={<Package className="h-6 w-6" />} color="amber" loading={loadSum} />
        <StatCard title="Stok Hampir Habis" value={summary?.low_stock_count ?? 0} icon={<AlertTriangle className="h-6 w-6" />} color="red" loading={loadSum} />
      </div>

      {/* Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Tren Pendapatan — {period === '7d' ? '7 Hari' : period === '30d' ? '30 Hari' : '90 Hari'} Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          {loadTrend ? <PageLoader /> : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => new Date(v).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Pendapatan']} labelFormatter={(l) => new Date(l).toLocaleDateString('id-ID', { weekday: 'long', month: 'long', day: 'numeric' })} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#d97706" strokeWidth={2} fill="url(#areaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Payment + Top Products */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Metode Pembayaran</CardTitle></CardHeader>
          <CardContent>
            {loadPay ? <PageLoader /> : pieData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Belum ada data</div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry) => (
                        <Cell key={entry.key} fill={PIE_COLORS[entry.key] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {pieData.map((entry) => (
                    <div key={entry.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: PIE_COLORS[entry.key] || '#94a3b8' }} />
                        <span className="text-sm text-gray-700">{entry.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(entry.value)}</p>
                        <p className="text-xs text-gray-400">{formatNumber(entry.count)} transaksi</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Produk Terlaris</CardTitle></CardHeader>
          <CardContent>
            {loadTop ? <PageLoader /> : !topProducts || topProducts.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Belum ada data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis dataKey="product_name" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={100} />
                  <Tooltip formatter={(v: number) => [`${v} porsi`, 'Terjual']} contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                  <Bar dataKey="total_quantity" fill="#d97706" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Shift Performance */}
      {shiftPerf && shiftPerf.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Performa Shift</CardTitle></CardHeader>
          <CardContent>
            {loadShift ? <PageLoader /> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left py-2 pr-4 text-gray-500 font-medium">Nama Shift</th><th className="text-right py-2 pr-4 text-gray-500 font-medium">Total Order</th><th className="text-right py-2 text-gray-500 font-medium">Total Pendapatan</th><th className="py-2 pl-4 text-gray-500 font-medium w-48">Proporsi</th></tr></thead>
                  <tbody>
                    {shiftPerf.map((s) => {
                      const totalRev = shiftPerf.reduce((a, b) => a + Number(b.total_revenue), 0);
                      const pct = totalRev > 0 ? (Number(s.total_revenue) / totalRev) * 100 : 0;
                      return (
                        <tr key={s.shift_name} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">{s.shift_name}</td>
                          <td className="py-3 pr-4 text-right text-gray-600">{formatNumber(Number(s.total_orders))}</td>
                          <td className="py-3 text-right font-semibold text-amber-700">{formatCurrency(s.total_revenue)}</td>
                          <td className="py-3 pl-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 w-10 text-right">{pct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
