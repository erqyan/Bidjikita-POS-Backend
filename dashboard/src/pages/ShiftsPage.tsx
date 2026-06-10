import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  getShifts, createShift, updateShift, deleteShift,
} from '@/api/shifts';
import type { Shift } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useToast } from '@/store/toastStore';
import { formatDate } from '@/lib/utils';

const schema = z.object({
  shift_name: z.string().min(1, 'Nama shift wajib diisi'),
  shift_date: z.string().min(1, 'Tanggal wajib diisi'),
  start_time: z.string().min(1, 'Jam mulai wajib diisi'),
  end_time: z.string().min(1, 'Jam selesai wajib diisi'),
  status: z.enum(['open', 'closed']).default('open'),
});
type FormData = z.infer<typeof schema>;

export default function ShiftsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Shift | null>(null);
  const [status, setStatus] = useState<'open' | 'closed'>('open');

  const { data: shifts = [], isPending } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => getShifts().then((r) => r.data),
  });

  const {
    register, handleSubmit, reset, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { status: 'open' } });

  const openCreate = () => {
    setEditing(null);
    setStatus('open');
    reset({ status: 'open' });
    setOpen(true);
  };

  const openEdit = (s: Shift) => {
    setEditing(s);
    setStatus(s.status);
    reset({
      shift_name: s.shift_name,
      shift_date: s.shift_date,
      start_time: s.start_time?.slice(0, 16),
      end_time: s.end_time?.slice(0, 16),
      status: s.status,
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      if (editing) return updateShift(editing.id, data);
      return createShift(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      toast({ title: 'Berhasil', description: editing ? 'Shift diperbarui' : 'Shift ditambahkan', variant: 'success' });
      setOpen(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Terjadi kesalahan';
      toast({ title: 'Gagal', description: msg, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteShift(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      toast({ title: 'Berhasil', description: 'Shift dihapus', variant: 'success' });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menghapus';
      toast({ title: 'Gagal', description: msg, variant: 'destructive' });
      setDeleteTarget(null);
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{shifts.length} shift terdaftar</p>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Shift</Button>
      </div>

      {isPending ? (
        <PageLoader />
      ) : shifts.length === 0 ? (
        <EmptyState title="Belum ada shift" action={<Button onClick={openCreate} size="sm">Tambah Shift</Button>} />
      ) : (
        <TableWrapper>
          <TableHeader>
            <tr>
              <TableHead>No</TableHead>
              <TableHead>Nama Shift</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jam Mulai</TableHead>
              <TableHead>Jam Selesai</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {shifts.map((s, i) => (
              <TableRow key={s.id}>
                <TableCell className="text-gray-500">{i + 1}</TableCell>
                <TableCell className="font-medium">{s.shift_name}</TableCell>
                <TableCell>{formatDate(s.shift_date)}</TableCell>
                <TableCell className="text-gray-600">
                  {s.start_time ? new Date(s.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </TableCell>
                <TableCell className="text-gray-600">
                  {s.end_time ? new Date(s.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={s.status === 'open' ? 'success' : 'default'}>
                    {s.status === 'open' ? 'Buka' : 'Tutup'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteTarget(s)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableWrapper>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Shift' : 'Tambah Shift'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
            <Input label="Nama Shift" {...register('shift_name')} error={errors.shift_name?.message} placeholder="Contoh: Shift Pagi" />
            <Input label="Tanggal" type="date" {...register('shift_date')} error={errors.shift_date?.message} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Jam Mulai" type="datetime-local" {...register('start_time')} error={errors.start_time?.message} />
              <Input label="Jam Selesai" type="datetime-local" {...register('end_time')} error={errors.end_time?.message} />
            </div>
            <Select
              label="Status"
              options={[{ value: 'open', label: 'Buka' }, { value: 'closed', label: 'Tutup' }]}
              value={status}
              onValueChange={(v) => { setStatus(v as 'open' | 'closed'); setValue('status', v as 'open' | 'closed'); }}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? 'Simpan' : 'Tambah Shift'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Shift"
        description={`Yakin ingin menghapus shift "${deleteTarget?.shift_name}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        confirmLabel="Hapus"
      />
    </div>
  );
}
