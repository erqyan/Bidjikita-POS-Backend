import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Search } from 'lucide-react';
import { getTransactions } from '@/api/transactions';
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

const paymentMethodLabel: Record<string, string> = {
  cash: 'Tunai', qris: 'QRIS', debit: 'Debit', credit: 'Kredit',
};

const paymentMethodVariant: Record<string, 'default' | 'success' | 'info' | 'purple' | 'warning'> = {
  cash: 'success', qris: 'info', debit: 'default', credit: 'purple',
};

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [viewTx, setViewTx] = useState<Transaction | null>(null);

  const { data: transactions = [], isPending } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions().then((r) => r.data),
  });

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch = !search || tx.invoice_number.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || tx.payment_status === statusFilter;
      const matchMethod = methodFilter === 'all' || tx.payment_method === methodFilter;
      return matchSearch && matchStatus && matchMethod;
    });
  }, [transactions, search, statusFilter, methodFilter]);

  const totalAmount = filtered.reduce((s, tx) => s + Number(tx.total_amount), 0);

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
            { value: 'all', label: 'Semua Status' },
            { value: 'paid', label: 'Lunas' },
            { value: 'pending', label: 'Pending' },
            { value: 'failed', label: 'Gagal' },
          ]}
          value={statusFilter}
          onValueChange={setStatusFilter}
          className="w-44"
        />
        <Select
          options={[
            { value: 'all', label: 'Semua Metode' },
            { value: 'cash', label: 'Tunai' },
            { value: 'qris', label: 'QRIS' },
            { value: 'debit', label: 'Debit' },
            { value: 'credit', label: 'Kredit' },
          ]}
          value={methodFilter}
          onValueChange={setMethodFilter}
          className="w-44"
        />
        {(search || statusFilter !== 'all' || methodFilter !== 'all') && (
          <Button variant="outline" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setMethodFilter('all'); }}>
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
              <TableHead>Status</TableHead>
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
                <TableCell>
                  <Badge variant={tx.payment_status === 'paid' ? 'success' : tx.payment_status === 'pending' ? 'warning' : 'danger'}>
                    {tx.payment_status === 'paid' ? 'Lunas' : tx.payment_status === 'pending' ? 'Pending' : 'Gagal'}
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
                <div><p className="text-gray-500">Shift</p><p className="font-medium">{viewTx.Shift?.shift_name || '-'}</p></div>
                <div><p className="text-gray-500">Metode Bayar</p><p className="font-medium capitalize">{paymentMethodLabel[viewTx.payment_method]}</p></div>
                <div><p className="text-gray-500">Status</p>
                  <Badge variant={viewTx.payment_status === 'paid' ? 'success' : viewTx.payment_status === 'pending' ? 'warning' : 'danger'}>
                    {viewTx.payment_status === 'paid' ? 'Lunas' : viewTx.payment_status === 'pending' ? 'Pending' : 'Gagal'}
                  </Badge>
                </div>
              </div>

              {viewTx.Order?.OrderDetails && viewTx.Order.OrderDetails.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Item Pesanan</p>
                  <div className="rounded-lg border border-gray-100 divide-y divide-gray-100">
                    {viewTx.Order.OrderDetails.map((od) => (
                      <div key={od.id} className="flex justify-between items-center px-4 py-2.5 text-sm">
                        <div>
                          <p className="font-medium">{od.Product?.product_name || '-'}</p>
                          {od.ProductVariant && <p className="text-xs text-gray-500">{od.ProductVariant.variant_name}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-gray-500">{od.quantity}× {formatCurrency(od.price)}</p>
                          <p className="font-semibold">{formatCurrency(od.subtotal)}</p>
                        </div>
                      </div>
                    ))}
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
    </div>
  );
}
