import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList,
} from 'recharts';
import { TrendingUp, TrendingDown, ShoppingCart, Package, AlertTriangle, DollarSign, Calendar } from 'lucide-react';
import {
  getAnalyticsSummary, getRevenueTrend, getTopProducts,
  getPaymentMethodStats, getProfitTrend,
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

  const { data: profitData, isPending: loadProfit } = useQuery({
    queryKey: ['profit-trend', period],
    queryFn: () => getProfitTrend(period).then((r) => r.data),
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
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all cursor-pointer ${period === p ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v: any) => new Date(v).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v: any) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value: any) => [formatCurrency(value), 'Pendapatan']} labelFormatter={(l: any) => new Date(l).toLocaleDateString('id-ID', { weekday: 'long', month: 'long', day: 'numeric' })} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#d97706" strokeWidth={2} fill="url(#areaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Net Profit Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Keuntungan Bersih — {period === '7d' ? '7 Hari' : period === '30d' ? '30 Hari' : '90 Hari'} Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          {loadProfit ? <PageLoader /> : !profitData || profitData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Belum ada data</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-[11px] text-green-600 font-medium">Pendapatan</p>
                  <p className="text-sm font-bold text-green-700">{formatCurrency(profitData.reduce((s, d) => s + d.revenue, 0))}</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-center">
                  <p className="text-[11px] text-red-600 font-medium">Biaya</p>
                  <p className="text-sm font-bold text-red-700">{formatCurrency(profitData.reduce((s, d) => s + d.cost, 0))}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <p className="text-[11px] text-amber-600 font-medium">Keuntungan Bersih</p>
                  <p className="text-sm font-bold text-amber-700">{formatCurrency(profitData.reduce((s, d) => s + d.profit, 0))}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={profitData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: any) => new Date(v).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v: any) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      const labels: Record<string, string> = { revenue: 'Pendapatan', cost: 'Biaya', profit: 'Keuntungan' };
                      return [formatCurrency(value), labels[name] || name];
                    }}
                    labelFormatter={(l: any) => new Date(l).toLocaleDateString('id-ID', { weekday: 'long', month: 'long', day: 'numeric' })}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend formatter={(value: string) => {
                    const labels: Record<string, string> = { revenue: 'Pendapatan', cost: 'Biaya', profit: 'Keuntungan' };
                    return <span className="text-xs">{labels[value] || value}</span>;
                  }} />
                  <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} fill="url(#profitGrad)" />
                  <Area type="monotone" dataKey="cost" stroke="#dc2626" strokeWidth={2} fill="url(#costGrad)" />
                  <Area type="monotone" dataKey="profit" stroke="#d97706" strokeWidth={2.5} fill="none" strokeDasharray="4 3" />
                </AreaChart>
              </ResponsiveContainer>
            </>
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
                    <Tooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
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
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts.slice(0, 8)} margin={{ left: 0, right: 20, top: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="product_name" type="category" tick={{ fontSize: 10, fill: '#64748b' }} angle={-20} textAnchor="end" height={60} label={{ value: 'Produk', position: 'bottom', offset: -10, style: { fontSize: 11, fill: '#94a3b8' } }} />
                  <YAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} label={{ value: 'Terjual (porsi)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#94a3b8' } }} />
                  <Tooltip formatter={(v: any) => [`${v} porsi`, 'Terjual']} contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                  <Bar dataKey="total_quantity" fill="#d97706" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="total_quantity" position="top" style={{ fontSize: 11, fontWeight: 600, fill: '#334155' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
