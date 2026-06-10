import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Package } from 'lucide-react';
import { getAllBundles, createBundle, updateBundle, deleteBundle } from '@/api/bundles';
import { getProducts } from '@/api/products';
import type { Bundle } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useToast } from '@/store/toastStore';
import { formatCurrency } from '@/lib/utils';
import apiClient from '@/lib/api';

const schema = z.object({
  bundle_name: z.string().min(1, 'Nama bundle wajib diisi'),
  description: z.string().optional(),
  bundle_price: z.coerce.number().min(1, 'Harga bundle wajib diisi'),
  items: z.array(z.object({
    product_id: z.coerce.number().min(1, 'Pilih produk'),
    quantity: z.coerce.number().min(1, 'Minimal 1'),
  })).min(1, 'Tambahkan minimal satu produk'),
});
type FormData = z.infer<typeof schema>;

export default function BundlesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bundle | null>(null);

  const { data: bundles = [], isPending } = useQuery({ queryKey: ['all-bundles'], queryFn: () => getAllBundles().then((r) => r.data) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => getProducts().then((r) => r.data) });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ product_id: 0, quantity: 1 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const openCreate = () => { setEditing(null); reset({ items: [{ product_id: 0, quantity: 1 }] }); setOpen(true); };
  const openEdit = (b: Bundle) => {
    setEditing(b);
    reset({
      bundle_name: b.bundle_name,
      description: b.description,
      bundle_price: b.bundle_price,
      items: b.BundleItems?.map((i) => ({ product_id: i.product_id, quantity: i.quantity })) || [{ product_id: 0, quantity: 1 }],
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = { ...data, items: data.items.map((i) => ({ product_id: Number(i.product_id), quantity: Number(i.quantity) })) };
      return editing ? updateBundle(editing.id, payload) : createBundle(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-bundles'] });
      toast({ title: 'Berhasil', description: editing ? 'Bundle diperbarui' : 'Bundle ditambahkan', variant: 'success' });
      setOpen(false);
    },
    onError: (err: unknown) => {
      toast({ title: 'Gagal', description: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBundle(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-bundles'] }); toast({ title: 'Berhasil', description: 'Bundle dihapus', variant: 'success' }); setDeleteTarget(null); },
    onError: () => { toast({ title: 'Gagal', description: 'Gagal menghapus bundle', variant: 'destructive' }); setDeleteTarget(null); },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (b: Bundle) => updateBundle(b.id, { bundle_price: b.bundle_price } as { bundle_price: number }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-bundles'] }),
  });

  const handleToggleActive = async (b: Bundle) => {
    try {
      await apiClient.put(`/bundles/${b.id}`, { ...b, is_active: !b.is_active, items: b.BundleItems?.map((i) => ({ product_id: i.product_id, quantity: i.quantity })) });
      qc.invalidateQueries({ queryKey: ['all-bundles'] });
      toast({ title: 'Berhasil', description: b.is_active ? 'Bundle dinonaktifkan' : 'Bundle diaktifkan', variant: 'success' });
    } catch {
      toast({ title: 'Gagal', description: 'Gagal mengubah status bundle', variant: 'destructive' });
    }
  };

  const productMap = Object.fromEntries(products.map((p) => [p.id, p.product_name]));

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{bundles.length} bundle terdaftar</p>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Bundle</Button>
      </div>

      {isPending ? <PageLoader /> : bundles.length === 0 ? (
        <EmptyState icon={<Package className="h-8 w-8 text-gray-400" />} title="Belum ada bundle" description="Buat paket produk untuk menarik lebih banyak pelanggan" action={<Button onClick={openCreate} size="sm">Tambah Bundle</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bundles.map((b) => (
            <Card key={b.id} className={!b.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-base">{b.bundle_name}</p>
                    {b.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{b.description}</p>}
                  </div>
                  <Badge variant={b.is_active ? 'success' : 'default'} className="ml-2 shrink-0">
                    {b.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>

                {b.BundleItems && b.BundleItems.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-400 mb-1.5">PRODUK DALAM BUNDLE:</p>
                    <ul className="space-y-1">
                      {b.BundleItems.map((item) => (
                        <li key={item.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                          {item.Product?.product_name || productMap[item.product_id] || `Produk #${item.product_id}`}
                          <span className="text-gray-400">×{item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="border-t pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Harga Bundle</span>
                    <span className="text-xl font-bold text-amber-600">{formatCurrency(b.bundle_price)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Total Biaya</span>
                    <span>{formatCurrency(b.total_bundle_cost)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Keuntungan</span>
                    <span className={Number(b.bundle_profit) >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {formatCurrency(b.bundle_profit)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(b)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggleActive(b)} title={b.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                    {b.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => setDeleteTarget(b)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? 'Edit Bundle' : 'Tambah Bundle'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
            <Input label="Nama Bundle" {...register('bundle_name')} error={errors.bundle_name?.message} placeholder="Contoh: Paket Hemat Pagi" />
            <Input label="Deskripsi (Opsional)" {...register('description')} placeholder="Deskripsi singkat bundle..." />
            <Input label="Harga Bundle (Rp)" type="number" {...register('bundle_price')} error={errors.bundle_price?.message} />

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Produk dalam Bundle</p>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ product_id: 0, quantity: 1 })}>
                  <Plus className="h-3.5 w-3.5" /> Tambah
                </Button>
              </div>
              {errors.items && typeof errors.items.message === 'string' && (
                <p className="text-xs text-red-600 mb-2">{errors.items.message}</p>
              )}
              <div className="space-y-2">
                {fields.map((field, idx) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <div className="flex-1">
                      <Controller name={`items.${idx}.product_id`} control={control} render={({ field: f }) => (
                        <Select options={products.map((p) => ({ value: String(p.id), label: p.product_name }))} value={f.value ? String(f.value) : undefined} onValueChange={(v) => f.onChange(Number(v))} placeholder="Pilih produk..." error={errors.items?.[idx]?.product_id?.message} />
                      )} />
                    </div>
                    <div className="w-24">
                      <Input type="number" min="1" placeholder="Qty" {...register(`items.${idx}.quantity`)} error={errors.items?.[idx]?.quantity?.message} />
                    </div>
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon-sm" className="mt-1 text-red-400 hover:bg-red-50" onClick={() => remove(idx)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? 'Simpan' : 'Tambah Bundle'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)} title="Hapus Bundle" description={`Hapus bundle "${deleteTarget?.bundle_name}"?`} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} loading={deleteMutation.isPending} confirmLabel="Hapus" />
    </div>
  );
}
