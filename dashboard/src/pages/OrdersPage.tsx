import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Search, Download, Printer } from 'lucide-react';
import { getTransactions } from '@/api/transactions';
import { getFinancialReport, type FinancialReport } from '@/api/analytics';
import type { Transaction } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/Dialog';
import {
  TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import * as XLSX from 'xlsx';

const paymentMethodLabel: Record<string, string> = {
  cash: 'Tunai', qris: 'QRIS', debit: 'Debit', credit: 'Kredit',
};

const paymentMethodVariant: Record<string, 'default' | 'success' | 'info' | 'purple' | 'warning'> = {
  cash: 'success', qris: 'info', debit: 'default', credit: 'purple',
};

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cashierFilter, setCashierFilter] = useState('all');
  const [viewTx, setViewTx] = useState<Transaction | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [rptFrom, setRptFrom] = useState('');
  const [rptTo, setRptTo] = useState('');

  const { data: transactions = [], isPending } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions().then((r) => r.data),
  });

  const { data: report, isFetching: loadingReport, refetch: fetchReport } = useQuery({
    queryKey: ['financial-report', rptFrom, rptTo],
    queryFn: () => getFinancialReport(rptFrom, rptTo).then((r) => r.data),
    enabled: false,
  });

  // Extract unique cashiers for the filter dropdown
  const cashierOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const tx of transactions) {
      if (tx.User?.id && tx.User?.full_name) {
        map.set(tx.User.id, tx.User.full_name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ value: String(id), label: name }));
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch = !search || tx.invoice_number.toLowerCase().includes(search.toLowerCase());
      const matchMethod = methodFilter === 'all' || tx.payment_method === methodFilter;
      const matchCashier = cashierFilter === 'all' || String(tx.User?.id) === cashierFilter;

      // Date range filter
      let matchDate = true;
      if (tx.transaction_date) {
        const txDate = new Date(tx.transaction_date);
        // Normalise to date-only for comparison
        const txDay = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());

        if (dateFrom) {
          const from = new Date(dateFrom + 'T00:00:00');
          matchDate = matchDate && txDay >= from;
        }
        if (dateTo) {
          const to = new Date(dateTo + 'T23:59:59');
          matchDate = matchDate && txDay <= to;
        }
      }

      return matchSearch && matchMethod && matchCashier && matchDate;
    });
  }, [transactions, search, methodFilter, cashierFilter, dateFrom, dateTo]);

  const totalAmount = filtered.reduce((s, tx) => s + Number(tx.total_amount), 0);

  const hasActiveFilters = search || methodFilter !== 'all' || cashierFilter !== 'all' || dateFrom || dateTo;

  const resetFilters = () => {
    setSearch('');
    setMethodFilter('all');
    setCashierFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const printReport = () => {
    if (!report) return;
    const rows = report.transactions.map(tx =>
      `<tr><td class="px-4 py-2 font-mono text-xs">${tx.invoice}</td><td class="px-4 py-2 text-xs">${formatDateTime(tx.date)}</td><td class="px-4 py-2 text-xs">${tx.cashier}</td><td class="px-4 py-2 text-xs capitalize">${paymentMethodLabel[tx.method]||tx.method}</td><td class="px-4 py-2 text-right font-medium">${formatCurrency(tx.amount)}</td></tr>`
    ).join('');
    const products = report.topProducts.map(p =>
      `<tr><td class="px-4 py-2 font-medium">${p.name}</td><td class="px-4 py-2 text-right">${p.qty}</td><td class="px-4 py-2 text-right font-medium">${formatCurrency(p.revenue)}</td></tr>`
    ).join('');
    const methods = report.paymentMethods.map(pm =>
      `<tr><td class="px-4 py-2 capitalize">${paymentMethodLabel[pm.method]||pm.method}</td><td class="px-4 py-2 text-right">${pm.count}</td><td class="px-4 py-2 text-right font-medium">${formatCurrency(pm.total)}</td></tr>`
    ).join('');
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    w.document.write(`
      <html><head><title>Laporan Keuangan</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 40px; color: #1f2937; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .header { text-align: center; border-bottom: 2px solid #d1d5db; padding-bottom: 16px; margin-bottom: 24px; }
        .header h1 { font-size: 20px; margin: 0 0 4px; }
        .header p { font-size: 14px; color: #6b7280; margin: 2px 0; }
        .cards { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .card { flex: 1; min-width: 140px; border-radius: 12px; padding: 12px; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .card .label { font-size: 11px; font-weight: 600; }
        .card .value { font-size: 14px; font-weight: 700; }
        .c-green { background: #f0fdf4 !important; } .c-green .label { color: #16a34a; } .c-green .value { color: #15803d; }
        .c-red { background: #fef2f2 !important; } .c-red .label { color: #dc2626; } .c-red .value { color: #b91c1c; }
        .c-amber { background: #fffbeb !important; } .c-amber .label { color: #d97706; } .c-amber .value { color: #b45309; }
        .c-blue { background: #eff6ff !important; } .c-blue .label { color: #2563eb; } .c-blue .value { color: #1d4ed8; }
        .c-purple { background: #faf5ff !important; } .c-purple .label { color: #9333ea; } .c-purple .value { color: #7e22ce; }
        h2 { font-size: 14px; font-weight: 600; margin: 20px 0 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #d1d5db; }
        th { background: #f3f4f6 !important; text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 600; color: #374151; text-transform: uppercase; border-bottom: 2px solid #d1d5db; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        th.right { text-align: right; }
        td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
        @media print { body { padding: 20px; } @page { size: A4; margin: 10mm; } .card, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="header">
        <h1>Bidjikita Coffee Roastery</h1>
        <p>Laporan Keuangan</p>
        <p>${report.period.from} s.d. ${report.period.to}</p>
      </div>
      <div class="cards">
        <div class="card c-green"><div class="label">Pendapatan</div><div class="value">${formatCurrency(report.summary.revenue)}</div></div>
        <div class="card c-red"><div class="label">Biaya Produksi</div><div class="value">${formatCurrency(report.summary.cost)}</div></div>
        <div class="card c-amber"><div class="label">Keuntungan Bersih</div><div class="value">${formatCurrency(report.summary.profit)} (${report.summary.profitPct}%)</div></div>
        <div class="card c-blue"><div class="label">Total Transaksi</div><div class="value">${report.summary.txCount}</div></div>
        <div class="card c-purple"><div class="label">Rata-rata</div><div class="value">${formatCurrency(report.summary.avgTx)}</div></div>
      </div>
      <h2>Metode Pembayaran</h2>
      <table><thead><tr><th>Metode</th><th class="right">Jumlah</th><th class="right">Total</th></tr></thead><tbody>${methods}</tbody></table>
      <h2>Produk Terlaris</h2>
      <table><thead><tr><th>Produk</th><th class="right">Terjual</th><th class="right">Pendapatan</th></tr></thead><tbody>${products}</tbody></table>
      <h2>Daftar Transaksi (${report.transactions.length})</h2>
      <table><thead><tr><th>No. Faktur</th><th>Tanggal</th><th>Kasir</th><th>Metode</th><th class="right">Total</th></tr></thead><tbody>${rows}</tbody></table>
      <script>window.addEventListener('afterprint', () => window.close()); window.onload = () => window.print();</script>
      </body></html>`);
    w.document.close();
  };

  const exportExcel = () => {
    if (!report) return;
    const wb = XLSX.utils.book_new();
    const toSheet = (data: any[]) => XLSX.utils.json_to_sheet(data);
    const summaryData = [
      { Metrik: 'Periode', Nilai: report.period.from + ' - ' + report.period.to },
      { Metrik: 'Pendapatan', Nilai: report.summary.revenue },
      { Metrik: 'Biaya Produksi', Nilai: report.summary.cost },
      { Metrik: 'Keuntungan Bersih', Nilai: report.summary.profit },
      { Metrik: 'Margin', Nilai: report.summary.profitPct + '%' },
      { Metrik: 'Total Transaksi', Nilai: report.summary.txCount },
      { Metrik: 'Rata-rata', Nilai: report.summary.avgTx },
    ];
    const txExport = report.transactions.map(tx => ({
      Faktur: tx.invoice, Tanggal: tx.date ? new Date(tx.date).toLocaleDateString('id-ID') : '',
      Kasir: tx.cashier, Metode: tx.method, Total: tx.amount,
    }));
    XLSX.utils.book_append_sheet(wb, toSheet(summaryData), 'Ringkasan');
    XLSX.utils.book_append_sheet(wb, toSheet(report.daily), 'Harian');
    XLSX.utils.book_append_sheet(wb, toSheet(report.paymentMethods), 'Metode Bayar');
    XLSX.utils.book_append_sheet(wb, toSheet(report.topProducts), 'Produk Terlaris');
    XLSX.utils.book_append_sheet(wb, toSheet(report.cashiers), 'Kasir');
    XLSX.utils.book_append_sheet(wb, toSheet(txExport), 'Transaksi');
    XLSX.writeFile(wb, `laporan-keuangan-${report.period.from}-${report.period.to}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor faktur..."
            className="h-9 w-56 pl-9 pr-4 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <Select
          options={[
            { value: 'all', label: 'Semua Metode' },
            { value: 'cash', label: 'Tunai' },
            { value: 'qris', label: 'QRIS' },
          ]}
          value={methodFilter}
          onValueChange={setMethodFilter}
          className="w-44"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        {cashierOptions.length > 1 && (
          <Select
            options={[
              { value: 'all', label: 'Semua Kasir' },
              ...cashierOptions,
            ]}
            value={cashierFilter}
            onValueChange={setCashierFilter}
            className="w-44"
          />
        )}
        <Button onClick={() => { setRptFrom(dateFrom); setRptTo(dateTo); setReportOpen(true); }} size="sm"><Download className="h-4 w-4 mr-1" /> Laporan</Button>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Reset
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-sm text-gray-600">
        <span>{filtered.length} transaksi</span>
        <span className="text-gray-300">|</span>
        <span>Total: <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span></span>
      </div>

      {isPending ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState title="Tidak ada transaksi" description="Tidak ada transaksi yang sesuai dengan filter Anda" />
      ) : (
        <TableWrapper>
          <TableHeader>
            <tr>
              <TableHead>No. Faktur</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Kasir</TableHead>
              <TableHead>Metode</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Detail</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filtered.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="font-mono text-xs font-medium">{tx.invoice_number}</TableCell>
                <TableCell className="text-gray-600 text-xs">{formatDateTime(tx.transaction_date)}</TableCell>
                <TableCell>{tx.User?.full_name || tx.User?.username || '-'}</TableCell>
                <TableCell>
                    <Badge variant={paymentMethodVariant[tx.payment_method] || 'default'}>
                      {paymentMethodLabel[tx.payment_method] || tx.payment_method}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{formatCurrency(tx.total_amount)}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon-sm" onClick={() => setViewTx(tx)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableWrapper>
      )}

      {/* Detail dialog */}
      <Dialog open={!!viewTx} onOpenChange={(v) => !v && setViewTx(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
          </DialogHeader>
          {viewTx && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500">No. Faktur</p><p className="font-mono font-medium">{viewTx.invoice_number}</p></div>
                <div><p className="text-gray-500">Tanggal</p><p className="font-medium">{formatDateTime(viewTx.transaction_date)}</p></div>
                <div><p className="text-gray-500">Kasir</p><p className="font-medium">{viewTx.User?.full_name || viewTx.User?.username || '-'}</p></div>

                <div><p className="text-gray-500">Metode Bayar</p><p className="font-medium capitalize">{paymentMethodLabel[viewTx.payment_method]}</p></div>
              </div>

              {viewTx.Order?.OrderDetails && viewTx.Order.OrderDetails.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Item Pesanan</p>
                  <div className="rounded-lg border border-gray-100 divide-y divide-gray-100">
                    {viewTx.Order.OrderDetails.map((od) => {
                      // ── Bundle item ─────────────────────────────────────
                      if (od.bundle_id && od.bundle_items_json) {
                        let bundleContents: { product_name?: string; variant_name?: string; quantity?: number }[] = [];
                        try {
                          const raw = JSON.parse(od.bundle_items_json || '[]');
                          bundleContents = raw.map((bi: any) => ({
                            product_name: bi.product_name,
                            variant_name: bi.variant_name,
                            quantity: bi.quantity,
                          }));
                        } catch {}

                        return (
                          <div key={od.id} className="px-4 py-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">BUNDLE</span>
                              <span className="font-semibold text-gray-900 text-sm">{od.Bundle?.bundle_name || od.bundle_name || `Bundle #${od.bundle_id}`}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-500">{od.quantity}× Bundle</span>
                              <span className="text-sm font-bold text-amber-600">{formatCurrency(od.subtotal)}</span>
                            </div>
                            {bundleContents.length > 0 && (
                              <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
                                {bundleContents.map((bc, i) => (
                                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 text-xs">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shrink-0" />
                                    <span className="text-gray-700">{bc.product_name || 'Item'}</span>
                                    {bc.variant_name && <span className="text-gray-400">— {bc.variant_name}</span>}
                                    <span className="text-gray-400 ml-auto">×{bc.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // ── Regular item ────────────────────────────────────
                      return (
                        <div key={od.id} className="flex justify-between items-center px-4 py-2.5 text-sm">
                          <div>
                            <p className="font-medium">{od.Product?.product_name || '-'}</p>
                            {od.OrderDetailVariants && od.OrderDetailVariants.length > 0 && (
                              <p className="text-xs text-gray-500">
                                {od.OrderDetailVariants.map((odv) => odv.ProductVariant?.variant_name).filter(Boolean).join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-gray-500">{od.quantity}× {formatCurrency(od.price)}</p>
                            <p className="font-semibold">{formatCurrency(od.subtotal)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center border-t pt-3">
                <p className="font-semibold text-gray-900">Total</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(viewTx.total_amount)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* Financial Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Laporan Keuangan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Dari Tanggal</label>
                <input type="date" value={rptFrom} onChange={e => setRptFrom(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
                <input type="date" value={rptTo} onChange={e => setRptTo(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <Button onClick={() => fetchReport()} disabled={!rptFrom || !rptTo || loadingReport}>
                {loadingReport ? 'Memuat...' : 'Tampilkan'}
              </Button>
              <Button variant="outline" onClick={printReport} className="ml-auto" disabled={!report || loadingReport}>
                    <Printer className="h-4 w-4 mr-1" /> PDF
                  </Button>
                  <Button variant="outline" onClick={exportExcel} disabled={!report || loadingReport}>
                    <Download className="h-4 w-4 mr-1" /> Excel
                  </Button>
            </div>

            {loadingReport && <PageLoader />}

            {report && (
              <div className="space-y-6">

                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold text-gray-900">Bidjikita Coffee Roastery</h2>
                  <p className="text-sm text-gray-500">Laporan Keuangan</p>
                  <p className="text-sm text-gray-400">{report.period.from} s.d. {report.period.to}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[140px] rounded-xl bg-green-50 p-3 text-center"><p className="text-[11px] text-green-600 font-medium">Pendapatan</p><p className="text-sm font-bold text-green-700 break-words">{formatCurrency(report.summary.revenue)}</p></div>
                  <div className="flex-1 min-w-[140px] rounded-xl bg-red-50 p-3 text-center"><p className="text-[11px] text-red-600 font-medium">Biaya Produksi</p><p className="text-sm font-bold text-red-700 break-words">{formatCurrency(report.summary.cost)}</p></div>
                  <div className="flex-1 min-w-[140px] rounded-xl bg-amber-50 p-3 text-center"><p className="text-[11px] text-amber-600 font-medium">Keuntungan Bersih</p><p className="text-sm font-bold text-amber-700 break-words">{formatCurrency(report.summary.profit)} ({report.summary.profitPct}%)</p></div>
                  <div className="flex-1 min-w-[140px] rounded-xl bg-blue-50 p-3 text-center"><p className="text-[11px] text-blue-600 font-medium">Total Transaksi</p><p className="text-sm font-bold text-blue-700 break-words">{report.summary.txCount}</p></div>
                  <div className="flex-1 min-w-[140px] rounded-xl bg-purple-50 p-3 text-center"><p className="text-[11px] text-purple-600 font-medium">Rata-rata</p><p className="text-sm font-bold text-purple-700 break-words">{formatCurrency(report.summary.avgTx)}</p></div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Metode Pembayaran</p>
                  <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Metode</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Jumlah</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.paymentMethods.map(pm => (<tr key={pm.method}><td className="px-4 py-2 capitalize">{paymentMethodLabel[pm.method]||pm.method}</td><td className="px-4 py-2 text-right">{pm.count}</td><td className="px-4 py-2 text-right font-medium">{formatCurrency(pm.total)}</td></tr>))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Produk Terlaris</p>
                  <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Produk</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Terjual</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Pendapatan</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.topProducts.map(p => (<tr key={p.name}><td className="px-4 py-2 font-medium">{p.name}</td><td className="px-4 py-2 text-right">{p.qty}</td><td className="px-4 py-2 text-right font-medium">{formatCurrency(p.revenue)}</td></tr>))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Daftar Transaksi ({report.transactions.length})</p>
                  <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">No. Faktur</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tanggal</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Kasir</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Metode</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.transactions.map(tx => (<tr key={tx.id}><td className="px-4 py-2 font-mono text-xs">{tx.invoice}</td><td className="px-4 py-2 text-xs text-gray-600">{formatDateTime(tx.date)}</td><td className="px-4 py-2 text-xs">{tx.cashier}</td><td className="px-4 py-2 text-xs capitalize">{paymentMethodLabel[tx.method]||tx.method}</td><td className="px-4 py-2 text-right font-medium">{formatCurrency(tx.amount)}</td></tr>))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
