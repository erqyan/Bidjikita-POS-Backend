import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Eye } from 'lucide-react';
import apiClient from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { PageLoader } from '@/components/ui/Spinner';

interface ShiftItem {
  id: number;
  user_name: string;
  start_time: string;
  end_time: string | null;
  starting_cash: number;
  expected_cash: number | null;
  expected_qris: number | null;
  actual_cash: number | null;
  actual_qris: number | null;
  status: string;
}

interface ShiftDetail extends ShiftItem {
  orders: {
    id: number;
    order_number: string;
    invoice: string;
    payment_method: string;
    total_amount: number;
    items: { product_id: number; quantity: number; price: number; subtotal: number; bundle_name: string | null }[];
  }[];
}

const getShifts = () => apiClient.get<ShiftItem[]>('/shifts');
const getShiftDetail = (id: number) => apiClient.get<ShiftDetail>('/shifts/' + id);

const paymentMethodLabel: Record<string, string> = { cash: 'Tunai', qris: 'QRIS' };

function formatDuration(start: string, end?: string | null) {
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const diff = Math.floor((e.getTime() - s.getTime()) / 60000);
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? h + ' jam ' + m + ' mnt' : m + ' mnt';
}

export default function ShiftsPage() {
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data: shifts = [], isPending } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => getShifts().then((r) => r.data),
  });

  const { data: detail, isFetching: loadingDetail } = useQuery({
    queryKey: ['shift-detail', detailId],
    queryFn: () => getShiftDetail(detailId!).then((r) => r.data),
    enabled: !!detailId,
  });

  const activeShifts = shifts.filter((s) => s.status === 'active');
  const closedShifts = shifts.filter((s) => s.status === 'closed');

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Manajemen Shift</h2>

      {activeShifts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeShifts.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{s.user_name}</p>
                      <Badge variant="success">Aktif</Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      Sejak {formatDateTime(s.start_time)} · {formatDuration(s.start_time)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Uang awal: {formatCurrency(s.starting_cash)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDetailId(s.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Riwayat Shift</p>
        {isPending ? <PageLoader /> : closedShifts.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Belum ada shift yang selesai</p>
        ) : (
          <TableWrapper>
            <TableHeader>
              <tr>
                <TableHead>Kasir</TableHead>
                <TableHead>Mulai</TableHead>
                <TableHead>Selesai</TableHead>
                <TableHead>Durasi</TableHead>
                <TableHead>Uang Awal</TableHead>
                <TableHead>Harapan</TableHead>
                <TableHead>Aktual</TableHead>
                <TableHead>Selisih</TableHead>
                <TableHead className="text-right">Detail</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {closedShifts.map((s) => {
                const diff = Number(s.actual_cash || 0) - Number(s.expected_cash || 0);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.user_name}</TableCell>
                    <TableCell className="text-xs text-gray-600">{formatDateTime(s.start_time)}</TableCell>
                    <TableCell className="text-xs text-gray-600">{s.end_time ? formatDateTime(s.end_time) : '-'}</TableCell>
                    <TableCell className="text-xs">{formatDuration(s.start_time, s.end_time)}</TableCell>
                    <TableCell>{formatCurrency(s.starting_cash)}</TableCell>
                    <TableCell>{formatCurrency(s.expected_cash ?? 0)}</TableCell>
                    <TableCell>{formatCurrency(s.actual_cash ?? 0)}</TableCell>
                    <TableCell className={diff === 0 ? 'text-green-600' : 'text-red-600 font-medium'}>
                      {diff === 0 ? 'Rp 0' : formatCurrency(diff)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon-sm" onClick={() => setDetailId(s.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableWrapper>
        )}
      </div>

      <Dialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detail Shift</DialogTitle></DialogHeader>
          {loadingDetail ? <PageLoader /> : detail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500">Kasir</p><p className="font-medium">{detail.user_name}</p></div>
                <div><p className="text-gray-500">Mulai</p><p className="font-medium">{formatDateTime(detail.start_time)}</p></div>
                {detail.end_time && <div><p className="text-gray-500">Selesai</p><p className="font-medium">{formatDateTime(detail.end_time)}</p></div>}
                <div><p className="text-gray-500">Durasi</p><p className="font-medium">{formatDuration(detail.start_time, detail.end_time)}</p></div>
              </div>

              <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                <div className="flex justify-between px-4 py-2 text-sm"><span>Uang Awal</span><span className="font-medium">{formatCurrency(detail.starting_cash)}</span></div>
                {detail.expected_cash !== null && <div className="flex justify-between px-4 py-2 text-sm"><span>Tunai Harapan</span><span className="font-medium">{formatCurrency(detail.expected_cash)}</span></div>}
                {detail.expected_qris !== null && <div className="flex justify-between px-4 py-2 text-sm"><span>QRIS Harapan</span><span className="font-medium">{formatCurrency(detail.expected_qris)}</span></div>}
                {detail.actual_cash !== null && (
                  <div className="flex justify-between px-4 py-2 text-sm">
                    <span>Tunai Aktual</span>
                    <span className={detail.actual_cash === detail.expected_cash ? 'font-medium text-green-600' : 'font-medium text-red-600'}>
                      {formatCurrency(detail.actual_cash)}
                      {detail.actual_cash !== detail.expected_cash && (
                        <span className="ml-1 text-xs">({detail.actual_cash > (detail.expected_cash ?? 0) ? '+' : ''}{formatCurrency(detail.actual_cash - (detail.expected_cash ?? 0))})</span>
                      )}
                    </span>
                  </div>
                )}
                {detail.actual_qris !== null && (
                  <div className="flex justify-between px-4 py-2 text-sm">
                    <span>QRIS Aktual</span>
                    <span className={detail.actual_qris === detail.expected_qris ? 'font-medium text-green-600' : 'font-medium text-red-600'}>
                      {formatCurrency(detail.actual_qris)}
                    </span>
                  </div>
                )}
              </div>

              {detail.orders.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Transaksi ({detail.orders.length})</p>
                  <div className="rounded-lg border border-gray-100 divide-y divide-gray-100">
                    {detail.orders.map((o) => (
                      <div key={o.id} className="flex justify-between items-center px-3 py-2 text-sm">
                        <div>
                          <span className="font-mono text-xs text-gray-600">{o.invoice}</span>
                          <span className="ml-2 text-xs text-gray-400 capitalize">{paymentMethodLabel[o.payment_method] || o.payment_method}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(o.total_amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
